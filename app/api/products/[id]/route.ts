import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * PATCH /api/products/[id] – atualiza produto (ex.: supplier_id).
 * Apenas produtos de análises do usuário.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
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

    const body = (await request.json()) || {}
    const updates: Record<string, unknown> = {}
    if ('supplier_id' in body) {
      const v = body.supplier_id
      updates.supplier_id = v === null || v === '' ? null : v
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      console.error('[api/products] PATCH:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (e) {
    console.error('[api/products] PATCH:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
