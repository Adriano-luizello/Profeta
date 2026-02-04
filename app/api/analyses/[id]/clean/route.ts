import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { runClean } from '@/lib/services/run-clean'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: analysisId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const result = await runClean(supabase, user.id, analysisId)

  if (!result.success) {
    const status = result.error === 'Análise não encontrada' ? 404
      : result.error === 'Limpeza já em andamento' ? 400
      : 500
    return NextResponse.json(
      { error: result.error || 'Erro ao limpar dados' },
      { status }
    )
  }

  return NextResponse.json({
    success: true,
    analysis_id: analysisId,
    stats: result.stats
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: analysis, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !analysis) {
      return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      status: analysis.status,
      total_products: analysis.total_products,
      processed_products: analysis.processed_products,
      error_message: analysis.error_message
    })
  } catch (e) {
    console.error('Erro ao verificar progresso:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
