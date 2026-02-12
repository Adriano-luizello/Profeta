/**
 * Seed de dados sintéticos para perfil demo (screenshots / landing).
 *
 * Uso:
 *   1. Crie uma conta no app (ex: demo@profeta.com.br).
 *   2. Complete o onboarding (passo 1: empresa; passo 2: supply chain; passo 3: pode pular).
 *   3. Defina no .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 *   4. Rode: DEMO_USER_EMAIL=demo@profeta.com.br npm run seed:demo
 *
 * O script usa a service role para inserir dados no Supabase em nome do usuário
 * (organização, análise, produtos, vendas, forecasts, recomendações, etc.).
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Carrega .env.local da raiz do projeto
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

type Json = Record<string, unknown>

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.')
  process.exit(1)
}

if (!DEMO_USER_EMAIL) {
  console.error('Defina DEMO_USER_EMAIL (ex: demo@profeta.com.br).')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

// --- Dados sintéticos ---

const DEMO_ORG_NAME = 'Loja Demo Profeta'
const DEMO_FILE_NAME = 'vendas-demo-2025.csv'

const SUPPLIERS = [
  { name: 'Fornecedor Nacional Ltda', lead_time_days: 21, moq: 50 },
  { name: 'Importados & Cia', lead_time_days: 45, moq: 200 },
  { name: 'Atacado Regional', lead_time_days: 14, moq: 30 },
]

// Saúde do Estoque: urgency = days_until_stockout vs lead_time
// Confortável = ok/informative (dias >= lead+14); Atenção = (lead <= dias < lead+7); Crítico = (dias < lead ou 0)
// Parado = dead stock (sem vendas nos últimos 90 dias)
// Lead times dos fornecedores: 14, 21, 45. Default 30.
const PRODUCTS = [
  // Confortável (estoque alto: dias >= lead+14)
  { name: 'Camiseta Básica Algodão', category: 'Vestuário', price: 49.9, sku: 'CAM-001', baseDaily: 12, stock: 600, noSalesLast90d: false },
  { name: 'Relógio Digital', category: 'Acessórios', price: 99.9, sku: 'REL-005', baseDaily: 5, stock: 250, noSalesLast90d: false },
  { name: 'Vela Aromática', category: 'Decoração', price: 34.9, sku: 'VEL-012', baseDaily: 6, stock: 320, noSalesLast90d: false },
  { name: 'Capa de Celular', category: 'Acessórios', price: 39.9, sku: 'CAP-011', baseDaily: 11, stock: 550, noSalesLast90d: false },
  { name: 'Garrafa Térmica 500ml', category: 'Utilidades', price: 69.9, sku: 'GAR-006', baseDaily: 8, stock: 400, noSalesLast90d: false },
  // Atenção (lead <= dias < lead+7; ex: lead 30 → 300–369 un para baseDaily 10)
  { name: 'Calça Jeans Slim', category: 'Vestuário', price: 159.9, sku: 'CAL-002', baseDaily: 4, stock: 140, noSalesLast90d: false },
  { name: 'Carregador Portátil', category: 'Eletrônicos', price: 89.9, sku: 'CAR-010', baseDaily: 4, stock: 135, noSalesLast90d: false },
  { name: 'Shampoo Anticaspa', category: 'Beleza', price: 44.9, sku: 'SHA-015', baseDaily: 14, stock: 480, noSalesLast90d: false },
  { name: 'Almofada Decorativa', category: 'Decoração', price: 79.9, sku: 'ALM-013', baseDaily: 2, stock: 68, noSalesLast90d: false },
  // Crítico (estoque baixo ou zerado)
  { name: 'Tênis Casual', category: 'Calçados', price: 229.9, sku: 'TEN-003', baseDaily: 6, stock: 8, noSalesLast90d: false },
  { name: 'Mochila Executiva', category: 'Acessórios', price: 189.9, sku: 'MOC-004', baseDaily: 3, stock: 5, noSalesLast90d: false },
  { name: 'Fone Bluetooth', category: 'Eletrônicos', price: 149.9, sku: 'FON-009', baseDaily: 7, stock: 0, noSalesLast90d: false },
  { name: 'Kit Canetas Coloridas', category: 'Papelaria', price: 19.9, sku: 'KIT-008', baseDaily: 20, stock: 25, noSalesLast90d: false },
  { name: 'Suplemento Vitamina D', category: 'Saúde', price: 59.9, sku: 'SUP-014', baseDaily: 9, stock: 12, noSalesLast90d: false },
  // Parado (sem vendas nos últimos 90 dias)
  { name: 'Caderno A5 200fls', category: 'Papelaria', price: 24.9, sku: 'CAD-007', baseDaily: 15, stock: 200, noSalesLast90d: true },
  { name: 'Produto Descontinuado XYZ', category: 'Outros', price: 29.9, sku: 'OUT-099', baseDaily: 1, stock: 80, noSalesLast90d: true },
]

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function main() {
  console.log('Buscando usuário por email:', DEMO_USER_EMAIL)
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
  if (authError) {
    console.error('Erro ao listar usuários:', authError.message)
    process.exit(1)
  }
  const demoEmail = DEMO_USER_EMAIL as string
  const user = authData?.users?.find((u) => u.email?.toLowerCase() === demoEmail.toLowerCase())
  if (!user) {
    console.error('Usuário não encontrado. Crie uma conta com o email', demoEmail)
    process.exit(1)
  }
  const userId = user.id
  console.log('Usuário encontrado:', userId)

  // 1) Organização + profeta_users + settings
  let orgId: string
  const { data: existingProfile } = await supabase
    .from('profeta_users')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle()

  if (existingProfile?.organization_id) {
    orgId = existingProfile.organization_id
    console.log('Organização existente:', orgId)
    // Remove análise(s) de demo antiga(s) para esta conta (cascade apaga produtos, vendas, forecasts, etc.)
    const { data: oldAnalyses } = await supabase
      .from('analyses')
      .select('id')
      .eq('user_id', userId)
      .eq('file_name', DEMO_FILE_NAME)
    if (oldAnalyses?.length) {
      for (const a of oldAnalyses) {
        await supabase.from('analyses').delete().eq('id', a.id)
      }
      console.log('Análise(s) de demo anterior(es) removida(s):', oldAnalyses.length)
    }
  } else {
    const { data: newOrg, error: orgErr } = await supabase
      .from('organizations')
      .insert({ name: DEMO_ORG_NAME, plan: 'pro' })
      .select('id')
      .single()
    if (orgErr || !newOrg) {
      console.error('Erro ao criar organização:', orgErr?.message)
      process.exit(1)
    }
    orgId = newOrg.id
    await supabase.from('profeta_users').upsert({
      id: userId,
      organization_id: orgId,
      email: demoEmail,
      role: 'owner',
      onboarding_complete: true,
    })
    await supabase.from('settings').upsert({
      organization_id: orgId,
      default_lead_time_days: 30,
      default_moq: 100,
      default_safety_stock_multiplier: 1.5,
      stockout_warning_days: 14,
      overstock_threshold_multiplier: 3.0,
      min_data_quality_score: 0.6,
    }, { onConflict: 'organization_id' })
    console.log('Organização e settings criados.')
  }

  // 2) Fornecedores
  const supplierIds: string[] = []
  for (const s of SUPPLIERS) {
    const { data: row, error } = await supabase
      .from('suppliers')
      .insert({
        organization_id: orgId,
        name: s.name,
        lead_time_days: s.lead_time_days,
        moq: s.moq,
      })
      .select('id')
      .single()
    if (!error && row) supplierIds.push(row.id)
  }
  console.log('Fornecedores:', supplierIds.length)

  // 3) Análise
  const { data: analysis, error: analysisErr } = await supabase
    .from('analyses')
    .insert({
      user_id: userId,
      organization_id: orgId,
      file_name: DEMO_FILE_NAME,
      status: 'completed',
      total_products: PRODUCTS.length,
      processed_products: PRODUCTS.length,
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (analysisErr || !analysis) {
    console.error('Erro ao criar análise:', analysisErr?.message)
    process.exit(1)
  }
  const analysisId = analysis.id
  console.log('Análise criada:', analysisId)

  // 4) Produtos (com supplier_id alternado)
  const productIds: string[] = []
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i]
    const supplierId = supplierIds[i % supplierIds.length] ?? null
    const { data: row, error } = await supabase
      .from('products')
      .insert({
        analysis_id: analysisId,
        original_name: p.name,
        cleaned_name: p.name,
        refined_category: p.category,
        price: p.price,
        sku: p.sku,
        current_stock: p.stock,
        avg_daily_demand: p.baseDaily,
        safety_stock_days: 7,
        supplier_id: supplierId,
      })
      .select('id')
      .single()
    if (!error && row) productIds.push(row.id)
  }
  console.log('Produtos criados:', productIds.length)

  // 5) Histórico de vendas (últimos ~180 dias) — inserção em lotes
  const today = new Date()
  const BATCH = 300
  const salesRows: { product_id: string; date: string; quantity: number; revenue: number }[] = []
  for (let pi = 0; pi < productIds.length; pi++) {
    const productId = productIds[pi]
    const p = PRODUCTS[pi] as (typeof PRODUCTS)[0] & { noSalesLast90d?: boolean }
    if (!productId || !p) continue
    const skipLast90d = p.noSalesLast90d === true
    for (let d = 180; d >= 0; d--) {
      if (skipLast90d && d <= 90) continue // Parado: sem vendas nos últimos 90 dias
      const date = addDays(today, -d)
      const dayOfWeek = date.getDay()
      const weekend = dayOfWeek === 0 || dayOfWeek === 6
      const baseQty = p.baseDaily * (weekend ? 0.4 : 1) * (0.7 + Math.random() * 0.6)
      const qty = Math.max(0, Math.round(baseQty))
      if (qty === 0) continue
      salesRows.push({
        product_id: productId,
        date: toISODate(date),
        quantity: qty,
        revenue: Math.round(qty * p.price * 100) / 100,
      })
    }
  }
  for (let i = 0; i < salesRows.length; i += BATCH) {
    await supabase.from('sales_history').insert(salesRows.slice(i, i + BATCH))
  }
  console.log('Registros de vendas inseridos:', salesRows.length)

  // 6) Tabela forecasts (próximos 90 dias por produto)
  const forecastRows: {
    product_id: string
    forecast_date: string
    predicted_quantity: number
    lower_bound: number
    upper_bound: number
    confidence: number
  }[] = []
  for (let pi = 0; pi < productIds.length; pi++) {
    const productId = productIds[pi]
    const p = PRODUCTS[pi]
    if (!productId || !p) continue
    for (let d = 1; d <= 90; d++) {
      const date = addDays(today, d)
      const pred = Math.max(0, Math.round(p.baseDaily * (0.9 + Math.random() * 0.2)))
      forecastRows.push({
        product_id: productId,
        forecast_date: toISODate(date),
        predicted_quantity: pred,
        lower_bound: pred * 0.8,
        upper_bound: pred * 1.2,
        confidence: 0.85,
      })
    }
  }
  for (let i = 0; i < forecastRows.length; i += BATCH) {
    await supabase.from('forecasts').insert(forecastRows.slice(i, i + BATCH))
  }
  console.log('Previsões inseridas:', forecastRows.length)

  // 7) forecast_results (JSONB) para a análise
  const productForecasts = productIds.map((productId, pi) => {
    const p = PRODUCTS[pi]
    if (!p) return null
    const hist: { date: string; quantity: number }[] = []
    for (let d = 90; d >= 0; d--) {
      const date = addDays(today, -d)
      const qty = Math.max(0, Math.round(p.baseDaily * (0.8 + Math.random() * 0.4)))
      if (qty > 0) hist.push({ date: toISODate(date), quantity: qty })
    }
    const f30: { date: string; predicted_quantity: number; lower_bound: number; upper_bound: number }[] = []
    const f60: typeof f30 = []
    const f90: typeof f30 = []
    for (let d = 1; d <= 90; d++) {
      const date = addDays(today, d)
      const pred = p.baseDaily * (0.95 + Math.random() * 0.1)
      const pt = { date: toISODate(date), predicted_quantity: pred, lower_bound: pred * 0.8, upper_bound: pred * 1.2 }
      if (d <= 30) f30.push(pt)
      if (d <= 60) f60.push(pt)
      f90.push(pt)
    }
    return {
      product_id: productId,
      product_name: p.name,
      category: p.category,
      historical_data: hist,
      forecast_30d: f30,
      forecast_60d: f60,
      forecast_90d: f90,
      metrics: {
        mape: 12 + Math.random() * 8,
        rmse: null,
        mae: null,
        trend: 'stable' as const,
        seasonality_strength: 0.3,
      },
      recommendations: {
        restock_date: toISODate(addDays(today, 14)),
        suggested_quantity: Math.max(p.baseDaily * 30 - p.stock, 0),
        confidence: 0.85,
        reasoning: 'Estoque abaixo do ponto de ressuprimento recomendado.',
      },
    }
  }).filter(Boolean) as Json[]

  const forecastResponse = {
    analysis_id: analysisId,
    created_at: new Date().toISOString(),
    product_forecasts: productForecasts,
    category_forecasts: null,
    stats: {
      total_products: PRODUCTS.length,
      categories: [...new Set(PRODUCTS.map((p) => p.category))].length,
      forecast_horizons: [30, 60, 90],
      generated_at: new Date().toISOString(),
    },
  }
  await supabase.from('forecast_results').upsert(
    { analysis_id: analysisId, response: forecastResponse as unknown as Json, created_at: new Date().toISOString() },
    { onConflict: 'analysis_id' }
  )
  console.log('forecast_results (cache) inserido.')

  // 8) Recomendações (restock, urgent_restock, maintain, reduce)
  const recommendations: { product_id: string; action: string; reasoning: string; recommended_quantity: number; risk_level: string; urgency: string }[] = []
  productIds.forEach((productId, pi) => {
    const p = PRODUCTS[pi]
    if (!p) return
    if (p.stock === 0) {
      recommendations.push({
        product_id: productId,
        action: 'urgent_restock',
        reasoning: 'Estoque zerado. Reposição urgente para não perder vendas.',
        recommended_quantity: Math.max(p.baseDaily * 45, 50),
        risk_level: 'high',
        urgency: 'critical',
      })
    } else if (p.stock < p.baseDaily * 14) {
      recommendations.push({
        product_id: productId,
        action: 'restock',
        reasoning: `Estoque atual (${p.stock} un) cobre menos de 14 dias de demanda. Recomendado repor.`,
        recommended_quantity: Math.max(p.baseDaily * 30 - p.stock, 50),
        risk_level: 'medium',
        urgency: 'high',
      })
    } else if (p.stock > p.baseDaily * 90) {
      recommendations.push({
        product_id: productId,
        action: 'reduce',
        reasoning: `Estoque alto (${p.stock} un). Evitar novas compras até normalizar.`,
        recommended_quantity: 0,
        risk_level: 'low',
        urgency: 'low',
      })
    } else {
      recommendations.push({
        product_id: productId,
        action: 'maintain',
        reasoning: 'Nível de estoque adequado. Manter monitoramento.',
        recommended_quantity: 0,
        risk_level: 'low',
        urgency: 'low',
      })
    }
  })

  const recIds: string[] = []
  for (const r of recommendations) {
    const { data: row, error } = await supabase
      .from('recommendations')
      .insert({
        product_id: r.product_id,
        action: r.action,
        reasoning: r.reasoning,
        recommended_quantity: r.recommended_quantity || null,
        risk_level: r.risk_level,
        urgency: r.urgency,
      })
      .select('id')
      .single()
    if (!error && row) recIds.push(row.id)
  }
  console.log('Recomendações inseridas:', recIds.length)

  // 9) 1–2 alert_actions para "stockouts evitados"
  const urgentIndices = recommendations
    .map((r, i) => (r.action === 'urgent_restock' || r.action === 'restock' ? i : -1))
    .filter((i) => i >= 0)
  for (let i = 0; i < Math.min(2, urgentIndices.length); i++) {
    const idx = urgentIndices[i]
    const recId = recIds[idx]
    const rec = recommendations[idx]
    if (!recId || !rec) continue
    await supabase.from('alert_actions').insert({
      user_id: userId,
      product_id: rec.product_id,
      recommendation_id: recId,
      action_type: 'pedido_feito',
    })
  }
  console.log('Alert actions (pedido feito) inseridos.')

  console.log('\nConcluído. Faça login com', demoEmail, 'e acesse o dashboard para ver todos os dados.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
