import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/analyses/[id]/status
 * 
 * Retorna o status atual do pipeline para polling em tempo real.
 * Usado pelo frontend para mostrar progresso enquanto o pipeline executa.
 * 
 * Response:
 * {
 *   status: 'cleaning' | 'forecasting' | 'completed' | 'failed',
 *   error_message?: string,
 *   pipeline_started_at?: string,
 *   completed_at?: string,
 *   total_products?: number,
 *   processed_products?: number
 * }
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: analysisId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('analyses')
    .select('status, error_message, pipeline_started_at, completed_at, total_products, processed_products')
    .eq('id', analysisId)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
  }

  return NextResponse.json({
    status: data.status,
    error_message: data.error_message,
    pipeline_started_at: data.pipeline_started_at,
    completed_at: data.completed_at,
    total_products: data.total_products,
    processed_products: data.processed_products
  })
}
