import type { SupabaseClient } from '@supabase/supabase-js'
import { cleanProducts, calculateCleaningStats } from '@/lib/services/data-cleaner'
import { updatePipelineStatus } from '@/lib/services/update-pipeline-status'
import { logUsage } from '@/lib/usage-logger'

export interface RunCleanResult {
  success: boolean
  stats?: { valid: number; invalid: number; processing_time_ms: number }
  error?: string
}

/**
 * Executa limpeza (GPT-4) para uma análise.
 * Atualiza status para 'cleaning', depois 'completed' ou 'failed'.
 */
export async function runClean(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string
): Promise<RunCleanResult> {
  const { data: analysis, error: analysisError } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .eq('user_id', userId)
    .single()

  if (analysisError || !analysis) {
    return { success: false, error: 'Análise não encontrada' }
  }
  if (analysis.status === 'cleaning') {
    return { success: false, error: 'Limpeza já em andamento' }
  }

  // Marcar início do pipeline e status de limpeza
  await updatePipelineStatus(supabase, analysisId, 'cleaning', { markAsStarted: true })

  try {
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, original_name, original_category, price, description')
      .eq('analysis_id', analysisId)

    if (productsError || !products?.length) {
      throw new Error('Erro ao buscar produtos')
    }

    // Buscar histórico de vendas em BATCH (1 query ao invés de N)
    const productIds = products.map(p => p.id)
    const { data: allSales } = await supabase
      .from('sales_history')
      .select('product_id, quantity')
      .in('product_id', productIds)
      .order('date', { ascending: true })
    
    // Agrupar por product_id em memória
    const salesByProduct = new Map<string, number[]>()
    for (const sale of allSales || []) {
      const existing = salesByProduct.get(sale.product_id) || []
      existing.push(sale.quantity)
      salesByProduct.set(sale.product_id, existing)
    }
    
    // Construir array de produtos com histórico
    const productsWithHistory = products.map(p => ({
      ...p,
      sales_history: salesByProduct.get(p.id) ?? []
    }))

    // ===== TIMING: LIMPEZA START =====
    const cleanStart = Date.now()
    const results = await cleanProducts(productsWithHistory)
    const cleanMs = Date.now() - cleanStart
    const stats = calculateCleaningStats(results)

    console.log(`[Clean] Total: ${cleanMs}ms | ${productsWithHistory.length} produtos | Custo: $${stats.total_cost_usd.toFixed(4)}`)
    
    // Log de uso de GPT-4 (fire and forget — não bloqueia)
    // Agregar todos os produtos limpos em um único log por batch
    const totalInputTokens = results.reduce((sum, r) => sum + (r.tokens_used?.input || 0), 0)
    const totalOutputTokens = results.reduce((sum, r) => sum + (r.tokens_used?.output || 0), 0)
    
    if (totalInputTokens > 0 || totalOutputTokens > 0) {
      logUsage(supabase, {
        userId: userId,
        service: 'gpt4_cleaning',
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        model: 'gpt-4o-mini',  // Modelo usado no cleaning (CLEANING_CONFIG.model)
        analysisId: analysisId,
        metadata: {
          product_count: productsWithHistory.length,
          processing_time_ms: cleanMs,
          high_quality: stats.high_quality,
          medium_quality: stats.medium_quality,
          low_quality: stats.low_quality,
        }
      }).catch(() => {})  // Silenciar erros — logging nunca bloqueia
    }
    
    const processingTime = cleanMs

    // Updates paralelos de produtos limpos (produtos já existem, não precisa INSERT)
    const validUpdates = []
    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      const p = productsWithHistory[i]
      if (!r.success || !r.data) continue
      validUpdates.push({
        id: p.id,
        cleaned_name: r.data.cleaned_name,
        refined_category: r.data.refined_category,
        attributes: r.data.attributes,
        seasonality: r.data.seasonality,
        ai_confidence: r.data.ai_confidence
      })
    }
    
    if (validUpdates.length > 0) {
      // Promise.all: N updates em paralelo (não sequencial)
      const updateResults = await Promise.all(
        validUpdates.map(product => {
          const { id, ...updateData } = product
          return supabase
            .from('products')
            .update(updateData)
            .eq('id', id)
        })
      )
      
      // Log de erros (sem bloquear pipeline)
      const errors = updateResults.filter(r => r.error)
      if (errors.length > 0) {
        console.error(`[Clean] ${errors.length}/${validUpdates.length} updates falharam`)
        errors.forEach(e => console.error('  -', e.error))
      }
    }

    // Atualizar produtos processados (não mudar status aqui, deixar para o pipeline)
    await supabase
      .from('analyses')
      .update({
        processed_products: stats.valid
      })
      .eq('id', analysisId)

    return {
      success: true,
      stats: {
        valid: stats.valid,
        invalid: stats.invalid,
        processing_time_ms: processingTime
      }
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Erro desconhecido'
    await updatePipelineStatus(supabase, analysisId, 'failed', {
      error: `Erro na limpeza: ${errorMessage}`,
      markAsCompleted: true
    })
    return {
      success: false,
      error: errorMessage
    }
  }
}
