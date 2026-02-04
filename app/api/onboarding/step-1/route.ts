import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: existing } = await supabase
      .from('profeta_users')
      .select('id, organization_id')
      .eq('id', user.id)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({
        ok: true,
        organizationId: existing.organization_id,
        alreadyOnboarded: true,
      })
    }

    const body = await request.json()
    const companyName = typeof body?.companyName === 'string' ? body.companyName.trim() : ''
    if (!companyName) {
      return NextResponse.json({ error: 'Nome da empresa é obrigatório' }, { status: 400 })
    }

    const admin = createServiceRoleClient()
    const { data: org, error: orgError } = await admin
      .from('organizations')
      .insert({ name: companyName, plan: 'free' })
      .select('id')
      .single()

    if (orgError || !org) {
      console.error('step-1 org insert:', orgError)
      return NextResponse.json(
        { error: orgError?.message || 'Erro ao criar organização' },
        { status: 500 }
      )
    }

    const { error: userError } = await admin.from('profeta_users').insert({
      id: user.id,
      organization_id: org.id,
      email: user.email ?? '',
      role: 'owner',
      onboarding_complete: false,
    })

    if (userError) {
      await admin.from('organizations').delete().eq('id', org.id)
      console.error('step-1 profeta_users insert:', userError)
      return NextResponse.json(
        { error: userError.message || 'Erro ao criar perfil' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, organizationId: org.id })
  } catch (e) {
    console.error('onboarding step-1:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
