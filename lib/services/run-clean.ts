import type { SupabaseClient } from '@supabase/supabase-js'
import { cleanProducts, calculateCleaningStats } from '@/lib/services/data-cleaner'

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

  await supabase
    .from('analyses')
    .update({ status: 'cleaning' })
    .eq('id', analysisId)

  try {
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, original_name, original_category, price, description')
      .eq('analysis_id', analysisId)

    if (productsError || !products?.length) {
      throw new Error('Erro ao buscar produtos')
    }

    const productsWithHistory = await Promise.all(
      products.map(async (p) => {
        const { data: sales } = await supabase
          .from('sales_history')
          .select('quantity')
          .eq('product_id', p.id)
          .order('date', { ascending: true })
        return {
          ...p,
          sales_history: sales?.map((s) => s.quantity) ?? []
        }
      })
    )

    const start = Date.now()
    const results = await cleanProducts(productsWithHistory)
    const processingTime = Date.now() - start
    const stats = calculateCleaningStats(results)

    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      const p = productsWithHistory[i]
      if (!r.success || !r.data) continue
      await supabase
        .from('products')
        .update({
          cleaned_name: r.data.cleaned_name,
          refined_category: r.data.refined_category,
          attributes: r.data.attributes,
          seasonality: r.data.seasonality,
          ai_confidence: r.data.ai_confidence
        })
        .eq('id', p.id)
    }

    await supabase
      .from('analyses')
      .update({
        status: 'completed',
        processed_products: stats.valid,
        completed_at: new Date().toISOString(),
        error_message: null
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
    await supabase
      .from('analyses')
      .update({
        status: 'failed',
        error_message: e instanceof Error ? e.message : 'Erro desconhecido'
      })
      .eq('id', analysisId)
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Erro ao limpar'
    }
  }
}
