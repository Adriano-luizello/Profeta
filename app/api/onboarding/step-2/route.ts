import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
      .single()

    if (!pu?.organization_id) {
      return NextResponse.json(
        { error: 'Complete o passo 1 antes' },
        { status: 400 }
      )
    }

    const body = (await request.json()) || {}
    const default_lead_time_days = Math.max(1, Math.min(365, Number(body.default_lead_time_days) || 30))
    const default_moq = Math.max(0, Math.min(100000, Number(body.default_moq) || 100))
    const stockout_warning_days = Math.max(1, Math.min(90, Number(body.stockout_warning_days) || 14))

    const { error: settingsError } = await supabase.from('settings').upsert(
      {
        organization_id: pu.organization_id,
        default_lead_time_days,
        default_moq,
        stockout_warning_days,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id' }
    )

    if (settingsError) {
      console.error('step-2 settings upsert:', settingsError)
      return NextResponse.json(
        { error: settingsError.message || 'Erro ao salvar configurações' },
        { status: 500 }
      )
    }

    const { error: userUpdateError } = await supabase
      .from('profeta_users')
      .update({ onboarding_complete: true })
      .eq('id', user.id)

    if (userUpdateError) {
      console.error('step-2 onboarding_complete:', userUpdateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar onboarding' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('onboarding step-2:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
