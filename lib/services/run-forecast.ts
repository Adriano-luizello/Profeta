import type { SupabaseClient } from '@supabase/supabase-js'
import { forecastClient } from '@/lib/services/forecast-client'
import type {
  ForecastResponse,
  ForecastDataPoint,
  ForecastRecommendations
} from '@/types/forecasting'

export interface RunForecastResult {
  success: boolean
  error?: string
  response?: ForecastResponse
}

/**
 * Gera previsão (Python API) e persiste em `forecasts`.
 * Pressupõe que a análise já foi limpa (produtos com cleaned_name).
 */
export async function runForecast(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string
): Promise<RunForecastResult> {
  const { data: analysis, error: analysisError } = await supabase
    .from('analyses')
    .select('id, user_id')
    .eq('id', analysisId)
    .single()

  if (analysisError || !analysis || analysis.user_id !== userId) {
    return { success: false, error: 'Análise não encontrada ou não autorizada' }
  }

  const { count: cleanedCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('analysis_id', analysisId)
    .not('cleaned_name', 'is', null)

  if (!cleanedCount || cleanedCount === 0) {
    return { success: false, error: 'Nenhum produto limpo. Execute a limpeza antes.' }
  }

  try {
    const response = await forecastClient.generateForecast({
      analysis_id: analysisId,
      forecast_days: [30, 60, 90],
      by_product: true,
      by_category: true
    })

    await persistForecasts(supabase, response)
    await persistRecommendations(supabase, response)
    await persistForecastResult(supabase, analysisId, response)
    return { success: true, response }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Erro ao gerar previsão'
    }
  }
}

async function persistForecasts(
  supabase: SupabaseClient,
  res: ForecastResponse
): Promise<void> {
  if (!res.product_forecasts?.length) return

  for (const pf of res.product_forecasts) {
    await supabase.from('forecasts').delete().eq('product_id', pf.product_id)

    const rows: Array<{
      product_id: string
      forecast_date: string
      predicted_quantity: number
      lower_bound: number
      upper_bound: number
      confidence: number | null
    }> = []

    for (const arr of [pf.forecast_30d, pf.forecast_60d, pf.forecast_90d] as ForecastDataPoint[][]) {
      if (!Array.isArray(arr)) continue
      for (const p of arr) {
        rows.push({
          product_id: pf.product_id,
          forecast_date: p.date,
          predicted_quantity: p.predicted_quantity,
          lower_bound: p.lower_bound,
          upper_bound: p.upper_bound,
          confidence: pf.recommendations?.confidence ?? null
        })
      }
    }

    if (rows.length) {
      await supabase.from('forecasts').insert(rows)
    }
  }
}

async function persistRecommendations(
  supabase: SupabaseClient,
  res: ForecastResponse
): Promise<void> {
  if (!res.product_forecasts?.length) return

  for (const pf of res.product_forecasts) {
    const { error: delErr } = await supabase
      .from('recommendations')
      .delete()
      .eq('product_id', pf.product_id)
    if (delErr) console.error('[run-forecast] recommendations delete:', delErr.message)

    const r = pf.recommendations as ForecastRecommendations | undefined
    if (!r?.reasoning) continue

    const restock = (r.suggested_quantity ?? 0) > 0
    const action = restock ? 'restock' : 'maintain'
    const conf = r.confidence ?? 0.5
    const risk_level = restock ? (conf >= 0.7 ? 'high' : 'medium') : 'low'
    const urgency = restock ? (conf >= 0.8 ? 'high' : 'medium') : 'low'

    const { error: insErr } = await supabase.from('recommendations').insert({
      product_id: pf.product_id,
      action,
      recommended_quantity: r.suggested_quantity ?? null,
      reasoning: r.reasoning,
      risk_level,
      urgency,
      estimated_stockout_date: null,
      additional_notes: null
    })
    if (insErr) console.error('[run-forecast] recommendations insert:', insErr.message)
  }
}

async function persistForecastResult(
  supabase: SupabaseClient,
  analysisId: string,
  response: ForecastResponse
): Promise<void> {
  const { error } = await supabase
    .from('forecast_results')
    .upsert(
      {
        analysis_id: analysisId,
        response: response as unknown as Record<string, unknown>,
        created_at: new Date().toISOString()
      },
      { onConflict: 'analysis_id' }
    )
  if (error) console.error('[run-forecast] forecast_results upsert:', error.message)
}

/**
 * Busca forecast da análise a partir do cache (forecast_results).
 * Usado no dashboard e no GET /api/analyses/[id]/forecast para não depender do Python GET.
 */
export async function getForecastFromDb(
  supabase: SupabaseClient,
  analysisId: string
): Promise<ForecastResponse | null> {
  const { data, error } = await supabase
    .from('forecast_results')
    .select('response')
    .eq('analysis_id', analysisId)
    .maybeSingle()

  if (error) {
    console.error('[getForecastFromDb]', error.message)
    return null
  }
  if (!data?.response) return null
  return data.response as unknown as ForecastResponse
}
