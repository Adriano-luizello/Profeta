import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/alert-actions – marca um alerta como "pedido feito".
 * Body: { product_id: string, recommendation_id: string }
 * Usado para a métrica Stockouts evitados.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = (await request.json()) || {}
    const productId = typeof body.product_id === 'string' ? body.product_id.trim() : null
    const recommendationId =
      typeof body.recommendation_id === 'string' ? body.recommendation_id.trim() : null

    if (!productId || !recommendationId) {
      return NextResponse.json(
        { error: 'product_id e recommendation_id são obrigatórios' },
        { status: 400 }
      )
    }

    const { data: product } = await supabase
      .from('products')
      .select('id, analysis_id')
      .eq('id', productId)
      .single()

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    const { data: analysis } = await supabase
      .from('analyses')
      .select('user_id')
      .eq('id', product.analysis_id)
      .single()

    if (!analysis || analysis.user_id !== user.id) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    const { data: rec } = await supabase
      .from('recommendations')
      .select('id, product_id')
      .eq('id', recommendationId)
      .single()

    if (!rec || rec.product_id !== productId) {
      return NextResponse.json({ error: 'Recomendação não encontrada ou não pertence ao produto' }, { status: 404 })
    }

    const { error: insertError } = await supabase.from('alert_actions').insert({
      user_id: user.id,
      product_id: productId,
      recommendation_id: recommendationId,
      action_type: 'pedido_feito'
    })

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ ok: true, alreadyMarked: true }, { status: 200 })
      }
      console.error('[api/alert-actions] POST:', insertError.message)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, alreadyMarked: false }, { status: 201 })
  } catch (e) {
    console.error('[api/alert-actions] POST:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * GET /api/alert-actions – lista recommendation_ids já marcados como "pedido feito".
 * Query: ?recommendation_ids=id1,id2,... (opcional) para filtrar.
 * Retorna { markedRecommendationIds: string[] }.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('recommendation_ids')
    const recommendationIds = idsParam
      ? idsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : null

    let query = supabase
      .from('alert_actions')
      .select('recommendation_id')
      .eq('user_id', user.id)

    if (recommendationIds?.length) {
      query = query.in('recommendation_id', recommendationIds)
    }

    const { data: rows, error } = await query

    if (error) {
      console.error('[api/alert-actions] GET:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const markedRecommendationIds = (rows ?? []).map((r) => String(r.recommendation_id))
    return NextResponse.json({ markedRecommendationIds })
  } catch (e) {
    console.error('[api/alert-actions] GET:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
