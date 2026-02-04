import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** GET /api/suppliers – lista fornecedores da org do usuário. */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: pu } = await supabase
      .from('profeta_users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!pu?.organization_id) {
      return NextResponse.json({ suppliers: [] })
    }

    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('id, name, lead_time_days, moq, notes, created_at')
      .eq('organization_id', pu.organization_id)
      .order('name')

    if (error) {
      console.error('[api/suppliers] GET:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ suppliers: suppliers ?? [] })
  } catch (e) {
    console.error('[api/suppliers] GET:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/** POST /api/suppliers – cria fornecedor. */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: pu } = await supabase
      .from('profeta_users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!pu?.organization_id) {
      return NextResponse.json(
        { error: 'Complete o onboarding (passo 1) antes' },
        { status: 400 }
      )
    }

    const body = (await request.json()) || {}
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json(
        { error: 'Nome do fornecedor é obrigatório' },
        { status: 400 }
      )
    }

    const lead_time_days = Math.max(1, Math.min(365, Number(body.lead_time_days) || 30))
    const moq = Math.max(0, Math.min(100000, Number(body.moq) || 100))
    const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert({
        organization_id: pu.organization_id,
        name,
        lead_time_days,
        moq,
        notes
      })
      .select('id, name, lead_time_days, moq, notes, created_at')
      .single()

    if (error) {
      console.error('[api/suppliers] POST:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(supplier)
  } catch (e) {
    console.error('[api/suppliers] POST:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
