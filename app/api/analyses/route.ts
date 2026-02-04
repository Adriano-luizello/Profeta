import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { CSVRow } from '@/types/csv'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: pu } = await supabase
      .from('profeta_users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()
    const organizationId = pu?.organization_id ?? null

    // Parse request body
    const body = await request.json()
    const { fileName, csvData } = body as {
      fileName: string
      csvData: CSVRow[]
    }

    if (!fileName || !csvData || csvData.length === 0) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Count unique products (group by sku if present, else by product name)
    const productKey = (row: { sku?: string; product: string }) =>
      (row.sku ?? row.product).toString().toLowerCase().trim()
    const uniqueProducts = new Set(csvData.map((row) => productKey(row)))

    // Resolve suppliers: create or match by name (org-scoped)
    const supplierNameToId = new Map<string, string>()
    const norm = (s: string) => s.trim().toLowerCase()

    const supplierNames = new Set<string>()
    csvData.forEach((row) => {
      const s = row.supplier?.trim()
      if (s) supplierNames.add(s)
    })
    let suppliersCreated = 0

    if (supplierNames.size > 0 && !organizationId) {
      console.warn('[api/analyses] Fornecedores no CSV ignorados: usuário sem organização. Complete o onboarding (passo 1).')
    }

    if (organizationId && supplierNames.size > 0) {
      const { data: settings } = await supabase
        .from('settings')
        .select('default_lead_time_days, default_moq')
        .eq('organization_id', organizationId)
        .maybeSingle()
      const leadTime = settings?.default_lead_time_days ?? 30
      const moq = settings?.default_moq ?? 100

      const { data: existing } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('organization_id', organizationId)
      const list = existing ?? []

      for (const name of supplierNames) {
        const n = norm(name)
        const found = list.find((s) => norm(s.name) === n)
        if (found) {
          supplierNameToId.set(n, found.id)
          continue
        }
        const { data: created, error: insertErr } = await supabase
          .from('suppliers')
          .insert({
            organization_id: organizationId,
            name: name.trim(),
            lead_time_days: leadTime,
            moq,
          })
          .select('id')
          .single()

        if (insertErr) {
          console.error('[api/analyses] Erro ao criar fornecedor:', name, insertErr.message)
          return NextResponse.json(
            { error: `Erro ao criar fornecedor "${name}": ${insertErr.message}` },
            { status: 500 }
          )
        }
        if (created) {
          supplierNameToId.set(n, created.id)
          list.push({ id: created.id, name: name.trim() })
          suppliersCreated += 1
        }
      }
    }

    // Create analysis record
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        file_name: fileName,
        status: 'validating',
        total_products: uniqueProducts.size,
        processed_products: 0,
      })
      .select()
      .single()

    if (analysisError) {
      console.error('Error creating analysis:', analysisError)
      return NextResponse.json(
        { error: 'Erro ao criar análise' },
        { status: 500 }
      )
    }

    // Group data by product (by sku if present, else by product name)
    const productMap = new Map<string, CSVRow[]>()
    csvData.forEach((row) => {
      const key = productKey(row)
      if (!productMap.has(key)) {
        productMap.set(key, [])
      }
      productMap.get(key)!.push(row)
    })

    // Insert products and sales history
    for (const [productKey, rows] of productMap.entries()) {
      const firstRow = rows[0]
      const supp = firstRow.supplier?.trim()
      const supplierId = supp ? supplierNameToId.get(norm(supp)) ?? null : null

      // Estoque: usar o da linha mais recente (por data) que tiver stock
      const withStock = [...rows].filter((r) => r.stock != null)
      const byDate = withStock.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      const latestStock = byDate[0]?.stock

      const productInsert: Record<string, unknown> = {
        analysis_id: analysis.id,
        original_name: firstRow.product,
        original_category: firstRow.category,
        description: firstRow.description,
        price: firstRow.price,
      }
      if (firstRow.sku != null && String(firstRow.sku).trim() !== '') {
        productInsert.sku = String(firstRow.sku).trim()
      }
      if (supplierId) productInsert.supplier_id = supplierId
      if (latestStock != null) productInsert.current_stock = latestStock

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert(productInsert)
        .select()
        .single()

      if (productError) {
        console.error('Error creating product:', productError)
        continue
      }

      // Insert sales history for this product
      const salesData = rows.map((row) => ({
        product_id: product.id,
        date: row.date,
        quantity: row.quantity,
        revenue: row.quantity * row.price,
      }))

      const { error: salesError } = await supabase
        .from('sales_history')
        .insert(salesData)

      if (salesError) {
        console.error('Error creating sales history:', salesError)
      }
    }

    return NextResponse.json({
      success: true,
      analysisId: analysis.id,
      totalProducts: uniqueProducts.size,
      suppliersFromCsv: supplierNames.size,
      suppliersCreated,
    })
  } catch (error) {
    console.error('Error in POST /api/analyses:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Get all analyses for the user
    const { data: analyses, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching analyses:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar análises' },
        { status: 500 }
      )
    }

    return NextResponse.json({ analyses })
  } catch (error) {
    console.error('Error in GET /api/analyses:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/** DELETE /api/analyses - Remove todas as análises, produtos, vendas, previsões, recomendações, alertas e fornecedores do usuário */
export async function DELETE() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // 1. Remover análises (cascata no DB remove: products → sales_history, forecasts, recommendations; alert_actions via product_id/recommendation_id)
    const { data: deletedAnalyses, error: analysesError } = await supabase
      .from('analyses')
      .delete()
      .eq('user_id', user.id)
      .select('id')

    if (analysesError) {
      console.error('[api/analyses] DELETE analyses:', analysesError.message)
      return NextResponse.json(
        { error: 'Erro ao apagar análises' },
        { status: 500 }
      )
    }

    const analysesCount = deletedAnalyses?.length ?? 0

    // 2. Remover fornecedores da organização do usuário (limpa dados do dashboard)
    let suppliersCount = 0
    const { data: pu } = await supabase
      .from('profeta_users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()

    const organizationId = pu?.organization_id ?? null
    if (organizationId) {
      const { data: deletedSuppliers, error: suppliersError } = await supabase
        .from('suppliers')
        .delete()
        .eq('organization_id', organizationId)
        .select('id')

      if (!suppliersError) {
        suppliersCount = deletedSuppliers?.length ?? 0
      } else {
        console.error('[api/analyses] DELETE suppliers:', suppliersError.message)
      }
    }

    return NextResponse.json({
      deleted: analysesCount,
      deletedAnalyses: analysesCount,
      deletedSuppliers: suppliersCount,
    })
  } catch (e) {
    console.error('[api/analyses] DELETE:', e)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
