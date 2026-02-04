/**
 * Analytics Engine – orquestração central.
 * Valida request → monta plano → busca dados (Supabase / Python) → aplica regras → retorna AnalysisResult.
 */

import { createClient } from '@/lib/supabase/server'
import { forecastClient } from '@/lib/services/forecast-client'
import type { AnalysisRequest, AnalysisResult } from './types'
import type { ForecastResponse } from '@/types/forecasting'

export async function runAnalysis(
  request: AnalysisRequest,
  userId: string
): Promise<AnalysisResult> {
  if (request.analysisType === 'forecast') {
    return runForecastAnalysis(request, userId)
  }
  throw new Error(`analysisType "${request.analysisType}" ainda não implementado`)
}

async function runForecastAnalysis(
  request: AnalysisRequest,
  userId: string
): Promise<AnalysisResult> {
  const analysisId = request.analysisId ?? request.entityId
  if (!analysisId) {
    return {
      data: null,
      warnings: ['analysisId ou entityId é obrigatório para forecast'],
    }
  }

  const supabase = await createClient()
  const { data: analysis, error: analysisError } = await supabase
    .from('analyses')
    .select('id, user_id')
    .eq('id', analysisId)
    .single()

  if (analysisError || !analysis) {
    return { data: null, warnings: ['Análise não encontrada'] }
  }
  if (analysis.user_id !== userId) {
    return { data: null, warnings: ['Análise não pertence ao usuário'] }
  }

  const horizonDays = request.timeframe?.horizonDays ?? [30, 60, 90]
  const response = await forecastClient.generateForecast({
    analysis_id: analysisId,
    forecast_days: horizonDays,
    by_product: true,
    by_category: true,
  })

  const fr = response as ForecastResponse

  return {
    data: response,
    summary: fr.stats
      ? {
          current: fr.stats.total_products,
          predicted: fr.product_forecasts?.length ?? 0,
        }
      : undefined,
    confidence: fr.product_forecasts?.[0]
      ? {
          dataQuality: fr.product_forecasts[0].recommendations?.confidence ?? 0,
          forecastConfidence: fr.product_forecasts[0].recommendations?.confidence,
        }
      : undefined,
    warnings: [],
  }
}
