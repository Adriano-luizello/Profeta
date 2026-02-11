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
