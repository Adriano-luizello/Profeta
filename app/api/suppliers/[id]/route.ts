import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('profeta_users')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle()
  return data?.organization_id ?? null
}

/** GET /api/suppliers/[id] */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const orgId = await getOrgId(supabase, user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Org não encontrada' }, { status: 400 })
    }

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('id, name, lead_time_days, moq, notes, created_at')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (error || !supplier) {
      return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 })
    }

    return NextResponse.json(supplier)
  } catch (e) {
    console.error('[api/suppliers] GET [id]:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/** PATCH /api/suppliers/[id] */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const orgId = await getOrgId(supabase, user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Org não encontrada' }, { status: 400 })
    }

    const body = (await request.json()) || {}
    const updates: Record<string, unknown> = {}
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
    const ltd = Number(body.lead_time_days)
    if (!Number.isNaN(ltd) && ltd >= 1 && ltd <= 365) updates.lead_time_days = ltd
    const m = Number(body.moq)
    if (!Number.isNaN(m) && m >= 0 && m <= 100000) updates.moq = m
    if ('notes' in body) updates.notes = typeof body.notes === 'string' ? body.notes.trim() || null : null

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select('id, name, lead_time_days, moq, notes, created_at')
      .single()

    if (error) {
      console.error('[api/suppliers] PATCH:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(supplier)
  } catch (e) {
    console.error('[api/suppliers] PATCH [id]:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/** DELETE /api/suppliers/[id] */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const orgId = await getOrgId(supabase, user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Org não encontrada' }, { status: 400 })
    }

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)

    if (error) {
      console.error('[api/suppliers] DELETE:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/suppliers] DELETE [id]:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
