import { NextRequest, NextResponse } from 'next/server'

const PYTHON_API =
  process.env.NEXT_PUBLIC_PYTHON_API_URL ||
  process.env.PYTHON_API_URL ||
  'http://127.0.0.1:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  const { analysisId } = await params
  const period = request.nextUrl.searchParams.get('period') ?? '30'

  if (!analysisId) {
    return NextResponse.json(
      { error: 'analysisId obrigatório' },
      { status: 400 }
    )
  }

  try {
    const url = `${PYTHON_API}/api/dashboard/${analysisId}?period=${period}`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error('[api/dashboard] proxy error:', err)
    return NextResponse.json(
      {
        error: 'Falha ao conectar no backend. Verifique se o servidor Python está rodando em ' + PYTHON_API,
      },
      { status: 502 }
    )
  }
}
