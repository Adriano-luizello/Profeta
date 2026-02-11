import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupplyChainMetrics, type SupplyChainMetrics } from '@/lib/supply-chain'

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

export interface ParetoMetrics {
  product_id: string
  product_name: string
  refined_category: string | null
  total_revenue: number          // Receita total no período
  total_quantity: number          // Unidades vendidas no período
  contribution_pct: number        // % do total de receita (ex: 15.3)
  cumulative_pct: number          // % acumulado (ex: 45.2)
  rank: number                    // Posição no ranking (1 = maior receita)
  is_top_20: boolean              // true se está nos top 20% de produtos
  is_top_80_revenue: boolean      // true se contribui para os primeiros 80% de receita
  current_stock: number | null
  price: number | null
  capital_in_stock: number | null // current_stock × price
  // Cruzamento supply chain
  urgency_level: 'critical' | 'attention' | 'informative' | 'ok' | null
  days_until_stockout: number | null
}

/**
 * KPIs para dashboard: produtos em risco (recomendação de reposição) e stockouts evitados.
 * Usa a análise mais recente para evitar queries muito grandes.
 * 
 * RETROCOMPATIBILIDADE: Tenta usar novas métricas de supply chain (com avg_daily_demand).
 * Se avg_daily_demand não estiver disponível, faz fallback para recommendations antigas.
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
  
  // Tentar usar novas métricas de supply chain
  try {
    const supplyChainMetrics = await getSupplyChainMetrics(supabase, userId)
    
    // Se temos métricas válidas (com avg_daily_demand), usar o novo sistema
    const hasValidMetrics = supplyChainMetrics.some(m => m.avg_daily_demand !== null)
    
    if (hasValidMetrics && supplyChainMetrics.length > 0) {
      // Filtrar produtos com urgência != 'ok' (em risco)
      const atRisk = supplyChainMetrics.filter(m => m.urgency_level !== 'ok')
      
      // Mapear para ProdutoEmRisco (compatibilidade com componentes existentes)
      const produtosEmRiscoList: ProdutoEmRisco[] = atRisk.map(m => ({
        product_id: m.product_id,
        product_name: m.product_name,
        reasoning: m.urgency_reason,
        recommended_quantity: m.recommended_order_qty,
        analysis_id: m.analysis_id,
        risk_level: m.urgency_level === 'critical' ? 'high' : m.urgency_level === 'attention' ? 'medium' : 'low',
        urgency: m.urgency_level as ProdutoEmRisco['urgency'],
        supplier_name: m.supplier_name,
        supplier_lead_time_days: m.lead_time_days,
        supplier_moq: m.moq,
        current_stock: m.current_stock,
        recommendation_id: `sc-${m.product_id}` // ID sintético para compatibilidade
      }))
      
      // Alertas (critical e attention apenas)
      const alertas: AlertaReordenamento[] = atRisk
        .filter(m => m.urgency_level === 'critical' || m.urgency_level === 'attention')
        .map(m => ({
          product_id: m.product_id,
          product_name: m.product_name,
          analysis_id: m.analysis_id,
          recommended_quantity: m.recommended_order_qty ?? m.moq,
          moq: m.moq,
          leadTime: m.lead_time_days,
          dateLabel: m.urgency_level === 'critical' ? 'HOJE' : '3 dias',
          priority: m.urgency_level === 'critical' ? 'high' : 'medium',
          recommendation_id: `sc-${m.product_id}`
        }))
      
      // Buscar defaults e stockouts evitados (mesma lógica)
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
        produtosEmRisco: atRisk.length,
        stockoutsEvitados,
        produtosEmRiscoList,
        defaultLeadTimeDays,
        defaultMoq,
        alertas,
        markedRecommendationIds: Array.from(markedSet)
      }
    }
  } catch (error) {
    console.error('[dashboard] Erro ao usar supply chain metrics, usando fallback:', error)
  }
  
  // FALLBACK: Sistema antigo com recommendations

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

/**
 * Análise Pareto 80/20: ranking de produtos por receita
 * Calcula contribuição percentual, identifica top 20%, e cruza com supply chain
 */
export async function getParetoMetrics(
  supabase: SupabaseClient,
  userId: string,
  periodDays: number = 90
): Promise<ParetoMetrics[]> {
  // 1. Buscar análise mais recente
  const analysisId = await getLatestAnalysis(supabase, userId)
  if (!analysisId) return []

  // 2. Calcular data de corte
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - periodDays)
  const cutoffDateStr = cutoffDate.toISOString().slice(0, 10)

  // 3. Buscar todos os produtos da análise
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, cleaned_name, original_name, refined_category, price, current_stock')
    .eq('analysis_id', analysisId)
    .limit(MAX_PRODUCTS_PER_QUERY)

  if (productsError || !products?.length) {
    if (productsError) console.error('[pareto] getParetoMetrics products:', productsError.message)
    return []
  }

  const productIds = products.map(p => p.id)
  const productMap = new Map(products.map(p => [p.id, p]))

  // 4. Buscar sales_history do período
  const { data: sales, error: salesError } = await supabase
    .from('sales_history')
    .select('product_id, quantity, revenue')
    .in('product_id', productIds)
    .gte('date', cutoffDateStr)

  if (salesError) {
    console.error('[pareto] getParetoMetrics sales_history:', salesError.message)
    return []
  }

  // 5. Agregar vendas por produto (em memória)
  const revenueByProduct = new Map<string, { revenue: number; quantity: number }>()
  
  for (const sale of sales ?? []) {
    const pid = sale.product_id
    const current = revenueByProduct.get(pid) ?? { revenue: 0, quantity: 0 }
    
    // Usar revenue se disponível, senão calcular quantity × price
    const product = productMap.get(pid)
    const saleRevenue = sale.revenue != null 
      ? Number(sale.revenue)
      : (product?.price != null ? Number(sale.quantity) * Number(product.price) : 0)
    
    revenueByProduct.set(pid, {
      revenue: current.revenue + saleRevenue,
      quantity: current.quantity + Number(sale.quantity)
    })
  }

  // 6. Criar array com todos os produtos (incluindo sem vendas)
  const productMetrics = products.map(p => {
    const sales = revenueByProduct.get(p.id) ?? { revenue: 0, quantity: 0 }
    const price = p.price != null ? Number(p.price) : null
    const stock = p.current_stock != null ? Number(p.current_stock) : null
    const capitalInStock = stock != null && price != null ? stock * price : null
    
    return {
      product_id: p.id,
      product_name: (p.cleaned_name ?? p.original_name ?? 'Produto').trim() || 'Produto',
      refined_category: p.refined_category,
      total_revenue: sales.revenue,
      total_quantity: sales.quantity,
      current_stock: stock,
      price: price,
      capital_in_stock: capitalInStock,
      contribution_pct: 0,  // calculado depois
      cumulative_pct: 0,    // calculado depois
      rank: 0,              // calculado depois
      is_top_20: false,     // calculado depois
      is_top_80_revenue: false,  // calculado depois
      urgency_level: null as ParetoMetrics['urgency_level'],
      days_until_stockout: null
    }
  })

  // 7. Ordenar por receita DESC
  productMetrics.sort((a, b) => b.total_revenue - a.total_revenue)

  // 8. Calcular métricas percentuais
  const grandTotal = productMetrics.reduce((sum, p) => sum + p.total_revenue, 0)
  const totalProducts = productMetrics.length
  const top20Count = Math.ceil(totalProducts * 0.2)
  
  let cumulativeRevenue = 0
  productMetrics.forEach((p, index) => {
    p.rank = index + 1
    p.contribution_pct = grandTotal > 0 ? (p.total_revenue / grandTotal) * 100 : 0
    cumulativeRevenue += p.total_revenue
    p.cumulative_pct = grandTotal > 0 ? (cumulativeRevenue / grandTotal) * 100 : 0
    p.is_top_20 = p.rank <= top20Count
    p.is_top_80_revenue = p.cumulative_pct <= 80
  })

  // 9. Cruzar com supply chain metrics
  try {
    const supplyChainMetrics = await getSupplyChainMetrics(supabase, userId)
    const scMap = new Map(supplyChainMetrics.map(sc => [sc.product_id, sc]))
    
    productMetrics.forEach(p => {
      const sc = scMap.get(p.product_id)
      if (sc) {
        p.urgency_level = sc.urgency_level
        p.days_until_stockout = sc.days_until_stockout
      }
    })
  } catch (error) {
    console.error('[pareto] Erro ao cruzar com supply chain:', error)
    // Continuar sem supply chain data
  }

  return productMetrics
}
