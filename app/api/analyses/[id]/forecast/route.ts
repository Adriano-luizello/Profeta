import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { runForecast, getForecastFromDb } from '@/lib/services/run-forecast'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analysisId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const result = await runForecast(supabase, user.id, analysisId)

    if (!result.success) {
      const isConnectionRefused =
        typeof result.error === 'string' &&
        (result.error.toLowerCase().includes('fetch failed') ||
         result.error.toLowerCase().includes('connection'))
      const message = isConnectionRefused
        ? 'Não foi possível conectar à API de Forecast. Verifique se o Profeta Forecaster está rodando: em outro terminal, execute `./start.sh` dentro de profeta-forecaster.'
        : result.error || 'Erro ao gerar forecast'
      const status = result.error === 'Nenhum produto limpo. Execute a limpeza antes.' ? 400 : 500
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json(result.response)
  } catch (e: unknown) {
    console.error('Erro ao gerar forecast:', e)
    const err = e instanceof Error ? e : new Error('Erro ao gerar forecast')
    const isConnectionRefused =
      err.message.toLowerCase().includes('fetch failed') ||
      (err as { cause?: { code?: string } })?.cause?.code === 'ECONNREFUSED'
    const message = isConnectionRefused
      ? 'Não foi possível conectar à API de Forecast. Verifique se o Profeta Forecaster está rodando.'
      : err.message
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analysisId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: analysis } = await supabase
      .from('analyses')
      .select('id')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single()

    if (!analysis) {
      return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
    }

    const forecast = await getForecastFromDb(supabase, analysisId)

    if (!forecast) {
      return NextResponse.json({ error: 'Forecast não encontrado' }, { status: 404 })
    }

    return NextResponse.json(forecast)
  } catch (e) {
    console.error('Erro ao buscar forecast:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao buscar forecast' },
      { status: 500 }
    )
  }
}
