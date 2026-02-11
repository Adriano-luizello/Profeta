/**
 * Usage Logger - Tracking de consumo de tokens e custos de IA
 * 
 * Registra consumo de Claude (chat) e GPT-4 (limpeza) para calcular
 * custo por usuário antes de cobrar pelo produto.
 * 
 * IMPORTANTE: Este logging NUNCA deve bloquear ou quebrar o fluxo principal.
 * Se falhar ao inserir no Supabase, apenas loga no console.
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface UsageLogEntry {
  userId: string
  service: 'claude_chat' | 'gpt4_cleaning' | 'gpt4_forecast'
  inputTokens: number
  outputTokens: number
  model: string
  analysisId?: string
  metadata?: Record<string, unknown>
}

export interface UsageSummary {
  totalTokens: number
  totalCostCents: number
  totalCostBRL: string          // Formatado: "R$ 12,34"
  byService: {
    service: string
    tokens: number
    costCents: number
    count: number              // Quantas chamadas
  }[]
  periodDays: number
  dailyAvgCostCents: number
}

/**
 * Custos por modelo em centavos de USD por 1M tokens
 * 
 * Fonte: https://www.anthropic.com/pricing (Claude) e https://openai.com/pricing (GPT-4)
 * Atualizado: 11/02/2026
 */
const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  // Claude models
  'claude-3-5-sonnet-20241022': { input: 300, output: 1500 },   // $3/$15 per M
  'claude-3-5-sonnet': { input: 300, output: 1500 },
  'claude-3-sonnet-20240229': { input: 300, output: 1500 },
  'claude-3-opus-20240229': { input: 1500, output: 7500 },      // $15/$75 per M
  'claude-3-haiku-20240307': { input: 25, output: 125 },        // $0.25/$1.25 per M
  
  // GPT-4 models
  'gpt-4': { input: 1000, output: 3000 },                       // $10/$30 per M  
  'gpt-4-turbo': { input: 1000, output: 3000 },
  'gpt-4-turbo-preview': { input: 1000, output: 3000 },
  'gpt-4o': { input: 250, output: 1000 },                       // $2.50/$10 per M
  'gpt-4o-mini': { input: 15, output: 60 },                     // $0.15/$0.60 per M
  'gpt-3.5-turbo': { input: 50, output: 150 },                  // $0.50/$1.50 per M
}

/**
 * Calcula custo estimado em centavos de USD
 */
function estimateCostCents(model: string, inputTokens: number, outputTokens: number): number {
  // Normalizar nome do modelo (remover versões específicas se não existir)
  let normalizedModel = model
  if (!COST_PER_MILLION[model]) {
    // Tentar encontrar modelo base (ex: "claude-3-5-sonnet-..." -> "claude-3-5-sonnet")
    const baseModel = Object.keys(COST_PER_MILLION).find(key => model.startsWith(key))
    if (baseModel) {
      normalizedModel = baseModel
    }
  }
  
  // Buscar custo do modelo, fallback para Claude Sonnet (modelo default do chat)
  const costs = COST_PER_MILLION[normalizedModel] || COST_PER_MILLION['claude-3-5-sonnet-20241022']
  
  const inputCost = (inputTokens / 1_000_000) * costs.input
  const outputCost = (outputTokens / 1_000_000) * costs.output
  
  // Retornar em centavos, arredondado para cima (mínimo 1 centavo se teve consumo)
  const totalCents = Math.max(1, Math.ceil(inputCost + outputCost))
  return totalCents
}

/**
 * Registra uso de IA no banco de dados
 * 
 * IMPORTANTE: Esta função NUNCA deve lançar exceção ou bloquear o fluxo principal.
 * Use com .catch(() => {}) para fire-and-forget.
 */
export async function logUsage(
  supabase: SupabaseClient,
  entry: UsageLogEntry
): Promise<void> {
  const costCents = estimateCostCents(entry.model, entry.inputTokens, entry.outputTokens)
  
  try {
    const { error } = await supabase.from('usage_logs').insert({
      user_id: entry.userId,
      service: entry.service,
      input_tokens: entry.inputTokens,
      output_tokens: entry.outputTokens,
      estimated_cost_cents: costCents,
      model: entry.model,
      analysis_id: entry.analysisId || null,
      metadata: entry.metadata || {},
    })
    
    if (error) {
      console.error('[usage-logger] Failed to insert usage log:', error.message)
    }
  } catch (error) {
    // NUNCA falhar silenciosamente, mas também NUNCA bloquear o fluxo principal
    console.error('[usage-logger] Exception while logging usage:', error)
  }
}

/**
 * Busca resumo de consumo de um usuário em um período
 * 
 * Útil para:
 * - Admin dashboard (quanto cada usuário custa)
 * - User dashboard futuro (mostrar consumo ao usuário)
 * - Análise de custos antes de definir pricing
 */
export async function getUserUsageSummary(
  supabase: SupabaseClient,
  userId: string,
  periodDays: number = 30
): Promise<UsageSummary> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - periodDays)
  
  const { data: logs, error } = await supabase
    .from('usage_logs')
    .select('service, total_tokens, estimated_cost_cents')
    .eq('user_id', userId)
    .gte('created_at', cutoff.toISOString())
  
  if (error) {
    console.error('[usage-logger] Failed to fetch usage summary:', error.message)
    return {
      totalTokens: 0,
      totalCostCents: 0,
      totalCostBRL: 'R$ 0,00',
      byService: [],
      periodDays,
      dailyAvgCostCents: 0,
    }
  }
  
  if (!logs || logs.length === 0) {
    return {
      totalTokens: 0,
      totalCostCents: 0,
      totalCostBRL: 'R$ 0,00',
      byService: [],
      periodDays,
      dailyAvgCostCents: 0,
    }
  }
  
  // Agregar por service
  const byService = new Map<string, { tokens: number; costCents: number; count: number }>()
  let totalTokens = 0
  let totalCostCents = 0
  
  for (const log of logs) {
    totalTokens += log.total_tokens
    totalCostCents += log.estimated_cost_cents
    
    const existing = byService.get(log.service) || { tokens: 0, costCents: 0, count: 0 }
    existing.tokens += log.total_tokens
    existing.costCents += log.estimated_cost_cents
    existing.count += 1
    byService.set(log.service, existing)
  }
  
  // Converter USD cents para BRL (usar taxa fixa por enquanto: 1 USD ≈ 5 BRL)
  const USD_TO_BRL = 5.0
  const totalBRL = (totalCostCents / 100) * USD_TO_BRL
  
  return {
    totalTokens,
    totalCostCents,
    totalCostBRL: `R$ ${totalBRL.toFixed(2).replace('.', ',')}`,
    byService: Array.from(byService.entries()).map(([service, data]) => ({
      service,
      ...data,
    })),
    periodDays,
    dailyAvgCostCents: Math.round(totalCostCents / periodDays),
  }
}

/**
 * Helper para queries SQL diretas de análise de custos
 * 
 * Exemplo de uso:
 * ```sql
 * -- Total de custos por usuário (últimos 30 dias)
 * SELECT 
 *   user_id,
 *   COUNT(*) as calls,
 *   SUM(input_tokens) as total_input,
 *   SUM(output_tokens) as total_output,
 *   SUM(estimated_cost_cents) as total_cost_cents,
 *   SUM(estimated_cost_cents) / 100.0 as total_cost_usd
 * FROM usage_logs
 * WHERE created_at >= NOW() - INTERVAL '30 days'
 * GROUP BY user_id
 * ORDER BY total_cost_cents DESC;
 * 
 * -- Custos por serviço (últimos 30 dias)
 * SELECT 
 *   service,
 *   COUNT(*) as calls,
 *   SUM(total_tokens) as total_tokens,
 *   SUM(estimated_cost_cents) as total_cost_cents
 * FROM usage_logs
 * WHERE created_at >= NOW() - INTERVAL '30 days'
 * GROUP BY service;
 * ```
 */
