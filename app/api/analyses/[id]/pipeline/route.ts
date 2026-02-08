import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { runClean } from '@/lib/services/run-clean'
import { runForecast } from '@/lib/services/run-forecast'

/**
 * Pipeline: limpeza (GPT-4) → previsão (Prophet).
 * Chamado automaticamente após upload ou manualmente.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: analysisId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // ===== TIMING: PIPELINE START =====
  const pipelineStart = Date.now()

  // ===== ETAPA 1: LIMPEZA =====
  const cleanStart = Date.now()
  const cleanResult = await runClean(supabase, user.id, analysisId)
  const cleanMs = Date.now() - cleanStart
  
  if (!cleanResult.success) {
    return NextResponse.json(
      { error: cleanResult.error || 'Falha na limpeza' },
      { status: 400 }
    )
  }

  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('analysis_id', analysisId)
  const totalProducts = count ?? 0

  // ===== ETAPA 2: FORECAST =====
  const forecastStart = Date.now()
  const forecastResult = await runForecast(supabase, user.id, analysisId)
  const forecastMs = Date.now() - forecastStart
  
  if (!forecastResult.success) {
    return NextResponse.json(
      { error: forecastResult.error || 'Falha na previsão', clean: true },
      { status: 400 }
    )
  }

  // ===== TIMING: PIPELINE END =====
  const totalMs = Date.now() - pipelineStart
  const cleanPerProduct = totalProducts > 0 ? Math.round(cleanMs / totalProducts) : 0
  const forecastPerProduct = totalProducts > 0 ? Math.round(forecastMs / totalProducts) : 0

  console.log(`[Pipeline] Total: ${totalMs}ms | Clean: ${cleanMs}ms | Forecast: ${forecastMs}ms`)
  console.log(`[Pipeline] Produtos: ${totalProducts} | Clean/produto: ${cleanPerProduct}ms | Forecast/produto: ${forecastPerProduct}ms`)

  return NextResponse.json({
    ok: true,
    analysisId,
    clean: true,
    forecast: true
  })
}
