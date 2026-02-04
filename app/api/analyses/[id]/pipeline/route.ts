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

  const cleanResult = await runClean(supabase, user.id, analysisId)
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
  const estimatedSeconds = Math.ceil(totalProducts * 7)
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60)
  console.log(
    `⏱️  Tempo estimado para ${totalProducts} produtos: ${estimatedMinutes} minuto(s)`
  )

  const forecastResult = await runForecast(supabase, user.id, analysisId)
  if (!forecastResult.success) {
    return NextResponse.json(
      { error: forecastResult.error || 'Falha na previsão', clean: true },
      { status: 400 }
    )
  }

  return NextResponse.json({
    ok: true,
    analysisId,
    clean: true,
    forecast: true
  })
}
