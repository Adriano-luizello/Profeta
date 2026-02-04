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

const anthropic = new Anthropic({
  apiKey: CLAUDE_CONFIG.apiKey,
})

function toolToChartQuery(toolName: string, toolInput: unknown): ChartQuery | null {
  const input = toolInput as { days?: number } | null | undefined
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
      return { type: 'supply_chain' }
    case 'get_alerts':
      return { type: 'alertas' }
    case 'get_sales_trend':
      return { type: 'line' }
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

    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory,
      { role: 'user', content: msgTrimmed },
    ]

    let response = await anthropic.messages.create({
      model: CLAUDE_CONFIG.model,
      max_tokens: CLAUDE_CONFIG.maxTokens,
      system: SYSTEM_PROMPT,
      tools: TOOL_DEFINITIONS,
      messages,
    })

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
    }

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    )
    const finalText =
      textBlock?.text ||
      'Desculpe, não consegui processar sua solicitação.'

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
