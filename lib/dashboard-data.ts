import type { SupabaseClient } from '@supabase/supabase-js'

export interface SalesPoint {
  date: string
  quantity: number
}

export interface ForecastPoint {
  date: string
  predicted_quantity: number
}

const DEFAULT_DAYS = 730
const MAX_PRODUCTS_PER_QUERY = 500

/**
 * Busca a análise mais recente completada do usuário.
 */
async function getLatestAnalysis(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('analyses')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[dashboard] getLatestAnalysis:', error.message)
    return null
  }
  return data?.id ?? null
}

export interface LatestAnalysisRow {
  id: string
  file_name: string
  total_products: number
  created_at: string
}

/**
 * Busca a análise mais recente completada do usuário com campos para o dashboard.
 */
export async function getLatestAnalysisWithDetails(
  supabase: SupabaseClient,
  userId: string
): Promise<LatestAnalysisRow | null> {
  const { data, error } = await supabase
    .from('analyses')
    .select('id, file_name, total_products, created_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[dashboard] getLatestAnalysisWithDetails:', error.message)
    return null
  }
  return data as LatestAnalysisRow | null
}

/**
 * Busca produtos de uma análise específica (limitado para evitar queries muito grandes).
 */
async function getProductIds(
  supabase: SupabaseClient,
  analysisId: string,
  limit: number = MAX_PRODUCTS_PER_QUERY
): Promise<string[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('analysis_id', analysisId)
    .limit(limit)

  if (error) {
    console.error('[dashboard] getProductIds:', error.message)
    return []
  }
  return data?.map((p) => p.id) ?? []
}

/**
 * Agrega vendas por data para o usuário (análise mais recente).
 * Limita aos últimos `days` dias.
 */
export async function getSalesByDate(
  supabase: SupabaseClient,
  userId: string,
  days: number = DEFAULT_DAYS
): Promise<SalesPoint[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().slice(0, 10)

  const analysisId = await getLatestAnalysis(supabase, userId)
  if (!analysisId) return []

  const productIds = await getProductIds(supabase, analysisId)
  if (!productIds.length) return []

  let { data: rows, error: salesError } = await supabase
    .from('sales_history')
    .select('date, quantity')
    .in('product_id', productIds)
    .gte('date', sinceStr)

  if (salesError) {
    console.error('[dashboard] getSalesByDate sales_history:', salesError.message)
    return []
  }
  if (!rows?.length) {
    const fallback = await supabase
      .from('sales_history')
      .select('date, quantity')
      .in('product_id', productIds)
    if (fallback.error) {
      console.error('[dashboard] getSalesByDate sales_history (fallback):', fallback.error.message)
      return []
    }
    rows = fallback.data
  }
  if (!rows?.length) return []

  const byDate = new Map<string, number>()
  for (const r of rows) {
    const d = String(r.date)
    byDate.set(d, (byDate.get(d) ?? 0) + Number(r.quantity))
  }
  return Array.from(byDate.entries())
    .map(([date, quantity]) => ({ date, quantity }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Agrega previsões por data (análise mais recente).
 * Só retorna dados se houver persistência (ex.: via pipeline).
 */
export async function getForecastsByDate(
  supabase: SupabaseClient,
  userId: string,
  days: number = DEFAULT_DAYS
): Promise<ForecastPoint[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().slice(0, 10)

  const analysisId = await getLatestAnalysis(supabase, userId)
  if (!analysisId) return []

  const productIds = await getProductIds(supabase, analysisId)
  if (!productIds.length) return []

  const { data: rows, error: forecastsError } = await supabase
    .from('forecasts')
    .select('forecast_date, predicted_quantity')
    .in('product_id', productIds)
    .gte('forecast_date', sinceStr)

  if (forecastsError) {
    console.error('[dashboard] getForecastsByDate forecasts:', forecastsError.message)
    return []
  }
  if (!rows?.length) return []

  const byDate = new Map<string, number>()
  for (const r of rows) {
    const d = String(r.forecast_date)
    byDate.set(d, (byDate.get(d) ?? 0) + Number(r.predicted_quantity))
  }
  return Array.from(byDate.entries())
    .map(([date, predicted_quantity]) => ({ date, predicted_quantity }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export interface ProdutoEmRisco {
  product_id: string
  product_name: string
  reasoning: string
  recommended_quantity: number | null
  analysis_id: string
  risk_level: 'low' | 'medium' | 'high' | null
  urgency: 'low' | 'medium' | 'high' | 'critical' | null
  /** Quando o produto tem supplier_id; usado na Supply Chain. */
  supplier_name: string | null
  supplier_lead_time_days: number | null
  supplier_moq: number | null
  /** Estoque atual (CSV stock/estoque ou null). */
  current_stock: number | null
  /** ID da recomendação (restock/urgent_restock); usado para "Marcar como pedido feito". */
  recommendation_id: string
}

export interface AlertaReordenamento {
  product_id: string
  product_name: string
  analysis_id: string
  recommended_quantity: number
  moq: number
  leadTime: number
  dateLabel: 'HOJE' | '3 dias'
  priority: 'high' | 'medium'
  /** ID da recomendação; usado para "Marcar como pedido feito". */
  recommendation_id: string
}

export interface DashboardKpis {
  produtosEmRisco: number
  stockoutsEvitados: number | null
  produtosEmRiscoList: ProdutoEmRisco[]
  defaultLeadTimeDays: number | null
  defaultMoq: number | null
  /** Alertas de reordenamento (urgency high/critical → HOJE; restock → 3 dias). */
  alertas: AlertaReordenamento[]
  /** IDs de recomendações já marcadas como "pedido feito" pelo usuário. */
  markedRecommendationIds: string[]
}

/**
 * KPIs para dashboard: produtos em risco (recomendação de reposição) e stockouts evitados.
 * Usa a análise mais recente para evitar queries muito grandes.
 */
export async function getDashboardKpis(
  supabase: SupabaseClient,
  userId: string
): Promise<DashboardKpis> {
  const empty = {
    produtosEmRisco: 0,
    stockoutsEvitados: null as number | null,
    produtosEmRiscoList: [] as ProdutoEmRisco[],
    defaultLeadTimeDays: null as number | null,
    defaultMoq: null as number | null,
    alertas: [] as AlertaReordenamento[],
    markedRecommendationIds: [] as string[]
  }

  const analysisId = await getLatestAnalysis(supabase, userId)
  if (!analysisId) return empty

  const { data: profetaUser } = await supabase
    .from('profeta_users')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle()
  let defaultLeadTimeDays: number | null = null
  let defaultMoq: number | null = null
  if (profetaUser?.organization_id) {
    const { data: settings } = await supabase
      .from('settings')
      .select('default_lead_time_days, default_moq')
      .eq('organization_id', profetaUser.organization_id)
      .maybeSingle()
    if (settings) {
      defaultLeadTimeDays = settings.default_lead_time_days ?? null
      defaultMoq = settings.default_moq ?? null
    }
  }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, cleaned_name, original_name, analysis_id, supplier_id, current_stock')
    .eq('analysis_id', analysisId)
    .limit(MAX_PRODUCTS_PER_QUERY)

  if (productsError || !products?.length) {
    if (productsError) console.error('[dashboard] getDashboardKpis products:', productsError.message)
    return { ...empty, defaultLeadTimeDays, defaultMoq }
  }

  const productIds = products.map((p) => p.id)
  const supplierIds = [...new Set(products.map((p) => p.supplier_id).filter(Boolean) as string[])]
  const supplierMap = new Map<string, { name: string; lead_time_days: number; moq: number }>()
  if (supplierIds.length > 0) {
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, name, lead_time_days, moq')
      .in('id', supplierIds)
    for (const s of suppliers ?? []) {
      supplierMap.set(s.id, {
        name: s.name,
        lead_time_days: s.lead_time_days ?? 30,
        moq: s.moq ?? 100
      })
    }
  }

  const productMap = new Map(products.map((p) => [p.id, p]))
  const { data: recs, error: recsError } = await supabase
    .from('recommendations')
    .select('id, product_id, action, reasoning, recommended_quantity, risk_level, urgency')
    .in('product_id', productIds)

  if (recsError) {
    console.error('[dashboard] getDashboardKpis recommendations:', recsError.message)
    return { ...empty, defaultLeadTimeDays, defaultMoq }
  }

  const list: ProdutoEmRisco[] = []
  const alertas: AlertaReordenamento[] = []
  const lead = defaultLeadTimeDays ?? 30
  const moq = defaultMoq ?? 100

  for (const r of recs ?? []) {
    if (r.action !== 'restock' && r.action !== 'urgent_restock') continue
    const p = productMap.get(r.product_id)
    if (!p?.analysis_id) continue
    const name = (p.cleaned_name ?? p.original_name ?? 'Produto').trim() || 'Produto'
    const sup = p.supplier_id ? supplierMap.get(p.supplier_id) : null
    const productLead = sup?.lead_time_days ?? lead
    const productMoq = sup?.moq ?? moq
    const qty = r.recommended_quantity ?? productMoq
    const urgent = r.urgency === 'high' || r.urgency === 'critical' || r.action === 'urgent_restock'
    const recId = String(r.id)
    list.push({
      product_id: r.product_id,
      product_name: name,
      reasoning: r.reasoning ?? '',
      recommended_quantity: r.recommended_quantity ?? null,
      analysis_id: p.analysis_id,
      risk_level: (r.risk_level as ProdutoEmRisco['risk_level']) ?? null,
      urgency: (r.urgency as ProdutoEmRisco['urgency']) ?? null,
      supplier_name: sup?.name ?? null,
      supplier_lead_time_days: sup?.lead_time_days ?? null,
      supplier_moq: sup?.moq ?? null,
      current_stock: p.current_stock != null ? Number(p.current_stock) : null,
      recommendation_id: recId
    })
    alertas.push({
      product_id: r.product_id,
      product_name: name,
      analysis_id: p.analysis_id,
      recommended_quantity: qty,
      moq: productMoq,
      leadTime: productLead,
      dateLabel: urgent ? 'HOJE' : '3 dias',
      priority: urgent ? 'high' : 'medium',
      recommendation_id: recId
    })
  }

  const since = new Date()
  since.setDate(since.getDate() - 90)
  const sinceStr = since.toISOString().slice(0, 10)
  const { data: actionsData } = await supabase
    .from('alert_actions')
    .select('recommendation_id, created_at')
    .eq('user_id', userId)
  const actions = actionsData ?? []

  let stockoutsEvitados = 0
  const markedSet = new Set<string>()
  for (const a of actions) {
    markedSet.add(String(a.recommendation_id))
    const d = String(a.created_at).slice(0, 10)
    if (d >= sinceStr) stockoutsEvitados += 1
  }

  return {
    produtosEmRisco: list.length,
    stockoutsEvitados,
    produtosEmRiscoList: list,
    defaultLeadTimeDays,
    defaultMoq,
    alertas,
    markedRecommendationIds: Array.from(markedSet)
  }
}
