import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import {
  generateChartData,
  type ChartQuery,
  type ChartOutput,
} from '@/lib/analytics/chart-data-generator'
import { CLAUDE_CONFIG, SYSTEM_PROMPT } from '@/lib/ai/claude-config'
import { TOOL_DEFINITIONS } from '@/lib/ai/tool-definitions'
import { checkRateLimit, recordTokenUsage } from '@/lib/rate-limit'
import { logUsage } from '@/lib/usage-logger'

const anthropic = new Anthropic({
  apiKey: CLAUDE_CONFIG.apiKey,
})

// Constantes de rate limiting e validação
const MAX_MESSAGE_LENGTH = 2000 // caracteres por mensagem
const MAX_MESSAGES_IN_CONTEXT = 50 // mensagens no histórico enviado

function toolToChartQuery(toolName: string, toolInput: unknown): ChartQuery | null {
  const input = toolInput as { days?: number; period_days?: number; view?: string; urgency_filter?: string; filter?: string } | null | undefined
  switch (toolName) {
    case 'get_forecast_analysis': {
      const days = input?.days
      const parsed =
        typeof days === 'number' && Number.isFinite(days)
          ? Math.min(730, Math.max(7, Math.round(days)))
          : undefined
      return { type: 'forecast', days: parsed }
    }
    case 'get_supply_chain_analysis':
      return { type: 'supply_chain', urgency_filter: input?.urgency_filter }
    case 'get_alerts':
      return { type: 'alertas' }
    case 'get_sales_trend':
      return { type: 'line' }
    case 'get_pareto_analysis': {
      return {
        type: 'pareto',
        period_days: input?.period_days ?? 90,
        view: input?.view ?? 'products'
      }
    }
    case 'get_dead_stock_analysis': {
      return {
        type: 'dead_stock',
        filter: input?.filter ?? 'all'
      }
    }
    case 'get_turnover_analysis': {
      return {
        type: 'turnover',
        period_days: input?.period_days ?? 90,
        view: input?.view ?? 'products'
      }
    }
    default:
      return null
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = (await request.json()) as { message?: string; conversationHistory?: Anthropic.MessageParam[] }
    const { message, conversationHistory = [] } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message é obrigatório' },
        { status: 400 }
      )
    }

    const msgTrimmed = message.trim()
    if (!msgTrimmed) {
      return NextResponse.json(
        { error: 'message é obrigatório' },
        { status: 400 }
      )
    }

    // ===== VALIDAÇÃO: TAMANHO DA MENSAGEM =====
    if (msgTrimmed.length > MAX_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({
          error: 'Mensagem muito longa',
          message: `Sua mensagem tem ${msgTrimmed.length} caracteres. O limite é ${MAX_MESSAGE_LENGTH}. Por favor, resuma sua pergunta.`,
        }),
        {
          status: 413,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // ===== RATE LIMIT CHECK =====
    const rateLimitResult = await checkRateLimit(user.id)
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'rate_limit',
          message: rateLimitResult.reason,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...(rateLimitResult.retryAfterSeconds
              ? { 'Retry-After': String(rateLimitResult.retryAfterSeconds) }
              : {}),
          },
        }
      )
    }

    // ===== TRUNCAMENTO DE HISTÓRICO =====
    let messages: Anthropic.MessageParam[] = [
      ...conversationHistory,
      { role: 'user', content: msgTrimmed },
    ]

    // Truncar se muito grande: manter últimas N mensagens
    if (messages.length > MAX_MESSAGES_IN_CONTEXT) {
      messages = messages.slice(-MAX_MESSAGES_IN_CONTEXT)
    }

    let response = await anthropic.messages.create({
      model: CLAUDE_CONFIG.model,
      max_tokens: CLAUDE_CONFIG.maxTokens,
      system: SYSTEM_PROMPT,
      tools: TOOL_DEFINITIONS,
      messages,
    })

    // Log de uso (fire and forget — não bloqueia resposta ao usuário)
    logUsage(supabase, {
      userId: user.id,
      service: 'claude_chat',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
      metadata: {
        initial_call: true,
      }
    }).catch(() => {})  // Silenciar erros — logging nunca bloqueia

    let chartOutput: ChartOutput | null = null

    while (response.stop_reason === 'tool_use') {
      const toolUse = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      )

      if (!toolUse) break

      const chartQuery = toolToChartQuery(toolUse.name, toolUse.input)

      let toolResult: { success: boolean; data?: ChartOutput; message: string }
      if (chartQuery) {
        const result = await generateChartData(supabase, user.id, chartQuery)
        chartOutput = result
        toolResult = {
          success: true,
          data: result ?? undefined,
          message: `Análise ${chartQuery.type} gerada com sucesso`,
        }
      } else {
        toolResult = {
          success: false,
          message: 'Ferramenta não encontrada',
        }
      }

      messages.push({
        role: 'assistant',
        content: response.content,
      })
      messages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(toolResult),
          },
        ],
      })

      response = await anthropic.messages.create({
        model: CLAUDE_CONFIG.model,
        max_tokens: CLAUDE_CONFIG.maxTokens,
        system: SYSTEM_PROMPT,
        tools: TOOL_DEFINITIONS,
        messages,
      })

      // Log de uso após tool call (fire and forget)
      logUsage(supabase, {
        userId: user.id,
        service: 'claude_chat',
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: response.model,
        metadata: {
          tool_used: toolUse?.name || null,
          has_chart: !!chartOutput,
        }
      }).catch(() => {})  // Silenciar erros
    }

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    )
    const finalText =
      textBlock?.text ||
      'Desculpe, não consegui processar sua solicitação.'

    // ===== REGISTRAR TOKENS USADOS =====
    const tokensUsed = response.usage
      ? response.usage.input_tokens + response.usage.output_tokens
      : 0
    if (tokensUsed > 0) {
      // Fire and forget - não bloquear resposta ao usuário
      recordTokenUsage(user.id, tokensUsed).catch((e) =>
        console.error('[Chat API] Failed to record token usage:', e)
      )
    }

    const apiResponse: {
      content: string
      conversationHistory: Anthropic.MessageParam[]
      chart?: { chartType: ChartOutput['chartType']; chartData: ChartOutput['chartData'] }
    } = {
      content: finalText,
      conversationHistory: messages,
    }

    if (chartOutput) {
      apiResponse.chart = {
        chartType: chartOutput.chartType,
        chartData: chartOutput.chartData,
      }
    }

    return NextResponse.json(apiResponse)
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar mensagem' },
      { status: 500 }
    )
  }
}
