/**
 * Chart Data Generator – produz dados para gráficos no chat.
 * Usa sales, forecasts e KPIs do dashboard.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getSalesByDate,
  getForecastsByDate,
  getDashboardKpis,
  getParetoMetrics,
  getDeadStockMetrics
} from '@/lib/dashboard-data'
import { getSupplyChainMetrics } from '@/lib/supply-chain'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export type ChartType = 'forecast' | 'line' | 'bar' | 'table'

export interface ChartOutput {
  chartType: ChartType
  chartData: Record<string, unknown>[] | unknown[]
}

const DEFAULT_DAYS = 90

/**
 * Gera dados para gráfico "forecast" (vendas + previsão no tempo).
 */
async function forecastChart(
  supabase: SupabaseClient,
  userId: string,
  days: number
): Promise<ChartOutput> {
  const [sales, forecasts] = await Promise.all([
    getSalesByDate(supabase, userId, days),
    getForecastsByDate(supabase, userId, days)
  ])

  const byDate = new Map<string, { actual: number | null; forecast: number | null; lower?: number; upper?: number }>()
  for (const s of sales) {
    byDate.set(s.date, { actual: s.quantity, forecast: null })
  }
  for (const f of forecasts) {
    const cur = byDate.get(f.date) ?? { actual: null, forecast: null }
    byDate.set(f.date, {
      ...cur,
      forecast: cur.forecast ?? f.predicted_quantity,
      lower: cur.lower ?? (f.predicted_quantity * 0.9),
      upper: cur.upper ?? (f.predicted_quantity * 1.1)
    })
  }

  const sorted = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date: format(new Date(date), 'dd MMM', { locale: ptBR }),
      actual: v.actual,
      forecast: v.forecast,
      lower: v.lower ?? null,
      upper: v.upper ?? null
    }))

  return { chartType: 'forecast', chartData: sorted }
}

/**
 * Gera dados para gráfico "line" (ex.: vendas agregadas por período).
 */
async function lineChart(
  supabase: SupabaseClient,
  userId: string,
  days: number
): Promise<ChartOutput> {
  const sales = await getSalesByDate(supabase, userId, days)
  const byMonth = new Map<string, number>()
  for (const s of sales) {
    const m = format(new Date(s.date), 'yyyy-MM', { locale: ptBR })
    byMonth.set(m, (byMonth.get(m) ?? 0) + s.quantity)
  }
  const sorted = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
  const chartData = sorted.map(([ym, value]) => ({
    month: format(new Date(ym + '-01'), 'MMM', { locale: ptBR }),
    value
  }))
  return { chartType: 'line', chartData }
}

/**
 * Gera dados para tabela "supply chain" (produtos em risco).
 * Usa as novas métricas de supply chain com ROP, urgência, e MOQ.
 */
async function supplyChainTable(
  supabase: SupabaseClient,
  userId: string,
  urgencyFilter?: string
): Promise<ChartOutput> {
  const metrics = await getSupplyChainMetrics(supabase, userId)
  
  // Filtrar por urgência se solicitado
  const filtered = urgencyFilter && urgencyFilter !== 'all'
    ? metrics.filter(m => m.urgency_level === urgencyFilter)
    : metrics
  
  const rows = filtered.map(m => ({
    produto: m.product_name,
    estoque_atual: m.current_stock != null ? String(m.current_stock) : '—',
    dias_ate_ruptura: m.days_until_stockout != null ? `${m.days_until_stockout} dias` : '—',
    data_ruptura: m.stockout_date ?? '—',
    reorder_point: m.reorder_point != null ? String(m.reorder_point) : '—',
    urgencia: formatUrgency(m.urgency_level),
    motivo: m.urgency_reason,
    quantidade_sugerida: m.recommended_order_qty != null ? `${m.recommended_order_qty} un` : '—',
    moq_alerta: m.moq_alert ?? '—',
    fornecedor: m.supplier_name ?? '—',
    lead_time: `${m.lead_time_days} dias`
  }))
  
  return { chartType: 'table', chartData: rows }
}

function formatUrgency(level: string | null): string {
  if (!level) return '—'
  switch(level) {
    case 'critical': return '🔴 Crítico'
    case 'attention': return '🟡 Atenção'
    case 'informative': return '🔵 Informativo'
    case 'ok': return '🟢 OK'
    default: return '—'
  }
}

/**
 * Gera dados para tabela "alertas".
 */
async function alertasTable(
  supabase: SupabaseClient,
  userId: string
): Promise<ChartOutput> {
  const kpis = await getDashboardKpis(supabase, userId)
  const rows = kpis.alertas.map((a) => ({
    produto: a.product_name,
    ação: `Pedir ${a.recommended_quantity} un até ${a.dateLabel}`,
    'MOQ': `${a.moq} un`,
    'Lead time': `${a.leadTime}d`
  }))
  return { chartType: 'table', chartData: rows }
}

/**
 * Formata valor monetário em Real brasileiro
 */
function formatBRL(value: number): string {
  try {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  } catch {
    // Fallback se toLocaleString não funcionar
    return `R$ ${value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
  }
}

/**
 * Gera dados para análise Pareto 80/20
 */
async function paretoTable(
  supabase: SupabaseClient,
  userId: string,
  periodDays: number = 90,
  view: string = 'products'
): Promise<ChartOutput> {
  const metrics = await getParetoMetrics(supabase, userId, periodDays)
  
  if (!metrics.length) {
    return {
      chartType: 'table',
      chartData: [{
        mensagem: `Sem dados de vendas para os últimos ${periodDays} dias.`
      }]
    }
  }
  
  // View: products (ranking completo)
  if (view === 'products') {
    const rows = metrics.map(m => ({
      rank: `#${m.rank}`,
      produto: m.product_name,
      categoria: m.refined_category ?? '—',
      receita: formatBRL(m.total_revenue),
      contribuicao: `${m.contribution_pct.toFixed(1)}%`,
      acumulado: `${m.cumulative_pct.toFixed(1)}%`,
      top_20: m.is_top_20 ? '⭐ Top 20%' : '—',
      urgencia: formatUrgency(m.urgency_level)
    }))
    return { chartType: 'table', chartData: rows }
  }
  
  // View: categories (agrupado por categoria)
  if (view === 'categories') {
    const categoryMap = new Map<string, { revenue: number; count: number }>()
    const grandTotal = metrics.reduce((sum, m) => sum + m.total_revenue, 0)
    
    for (const m of metrics) {
      const cat = m.refined_category ?? 'Sem categoria'
      const current = categoryMap.get(cat) ?? { revenue: 0, count: 0 }
      categoryMap.set(cat, {
        revenue: current.revenue + m.total_revenue,
        count: current.count + 1
      })
    }
    
    const rows = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        categoria: category,
        receita_total: formatBRL(data.revenue),
        percentual: `${((data.revenue / grandTotal) * 100).toFixed(1)}%`,
        qtd_produtos: `${data.count} produtos`,
        receita_media: formatBRL(data.revenue / data.count)
      }))
      .sort((a, b) => {
        const revA = parseFloat(a.receita_total.replace(/[^\d,]/g, '').replace(',', '.'))
        const revB = parseFloat(b.receita_total.replace(/[^\d,]/g, '').replace(',', '.'))
        return revB - revA
      })
    
    return { chartType: 'table', chartData: rows }
  }
  
  // View: at_risk (top sellers em risco)
  if (view === 'at_risk') {
    const atRisk = metrics.filter(m => 
      m.is_top_80_revenue && 
      (m.urgency_level === 'critical' || m.urgency_level === 'attention')
    )
    
    if (!atRisk.length) {
      return {
        chartType: 'table',
        chartData: [{
          mensagem: '✅ Nenhum top seller em risco. Supply chain saudável.'
        }]
      }
    }
    
    const rows = atRisk.map(m => ({
      rank: `#${m.rank}`,
      produto: m.product_name,
      receita: formatBRL(m.total_revenue),
      contribuicao: `${m.contribution_pct.toFixed(1)}%`,
      urgencia: formatUrgency(m.urgency_level),
      dias_ruptura: m.days_until_stockout != null ? `${m.days_until_stockout} dias` : '—',
      acao: m.urgency_level === 'critical' 
        ? '⚠️ Pedir HOJE — ruptura iminente'
        : '📋 Incluir no próximo pedido'
    }))
    
    return { chartType: 'table', chartData: rows }
  }
  
  // View desconhecida, retornar products como fallback
  return paretoTable(supabase, userId, periodDays, 'products')
}

/**
 * Formata tendência de forecast
 */
function formatTrend(trend: string | null): string {
  if (!trend) return '—'
  switch(trend) {
    case 'growing': return '📈 Crescente'
    case 'declining': return '📉 Declinante'
    case 'stable': return '➡️ Estável'
    case 'zero': return '⏸️ Zero'
    default: return '—'
  }
}

/**
 * Gera dados para análise de estoque parado
 */
async function deadStockTable(
  supabase: SupabaseClient,
  userId: string,
  filter: string = 'all'
): Promise<ChartOutput> {
  const metrics = await getDeadStockMetrics(supabase, userId)
  
  if (!metrics.length) {
    return {
      chartType: 'table',
      chartData: [{
        mensagem: 'Sem dados de produtos para análise de estoque parado.'
      }]
    }
  }
  
  // Filtro: summary (resumo executivo)
  if (filter === 'summary') {
    const deadProducts = metrics.filter(m => m.status === 'dead')
    const slowProducts = metrics.filter(m => m.status === 'slow')
    
    const capitalDead = deadProducts.reduce((sum, m) => sum + (m.capital_locked ?? 0), 0)
    const capitalSlow = slowProducts.reduce((sum, m) => sum + (m.capital_locked ?? 0), 0)
    const totalMonthlyCost = metrics.reduce((sum, m) => sum + (m.monthly_storage_cost ?? 0), 0)
    
    const toDiscontinue = metrics.filter(m => m.recommendation_type === 'discontinue').length
    const toDiscount = metrics.filter(m => m.recommendation_type === 'discount').length
    const toMonitor = metrics.filter(m => m.recommendation_type === 'monitor').length
    
    return {
      chartType: 'table',
      chartData: [
        { metrica: 'Produtos parados (0 vendas em 90d)', valor: `${deadProducts.length} produtos` },
        { metrica: 'Produtos lentos', valor: `${slowProducts.length} produtos` },
        { metrica: 'Capital total preso (parados)', valor: formatBRL(capitalDead) },
        { metrica: 'Capital total preso (lentos)', valor: formatBRL(capitalSlow) },
        { metrica: 'Custo de oportunidade mensal', valor: `~${formatBRL(totalMonthlyCost)}/mês` },
        { metrica: 'Recomendação: descontinuar', valor: `${toDiscontinue} produtos` },
        { metrica: 'Recomendação: desconto', valor: `${toDiscount} produtos` },
        { metrica: 'Recomendação: monitorar', valor: `${toMonitor} produtos` }
      ]
    }
  }
  
  // Filtros: 'all' ou 'dead'
  let filtered = metrics
  
  if (filter === 'dead') {
    filtered = metrics.filter(m => m.status === 'dead')
  } else {
    // 'all': excluir apenas produtos healthy
    filtered = metrics.filter(m => m.status !== 'healthy')
  }
  
  if (!filtered.length) {
    return {
      chartType: 'table',
      chartData: [{
        mensagem: '✅ Nenhum produto parado. Todos os produtos tiveram vendas nos últimos 90 dias.'
      }]
    }
  }
  
  // Tabela detalhada
  const rows = filtered.map(m => {
    const vendasText = m.total_quantity_90d === 0 
      ? '0 un'
      : `${m.total_quantity_90d} un (${formatBRL(m.total_revenue_90d)})`
    
    const ultimaVendaText = m.days_since_last_sale !== null 
      ? `Há ${m.days_since_last_sale} dias`
      : 'Sem vendas'
    
    const capitalText = m.capital_locked !== null 
      ? formatBRL(m.capital_locked)
      : '—'
    
    const custoMensalText = m.monthly_storage_cost !== null 
      ? `~${formatBRL(m.monthly_storage_cost)}/mês`
      : '—'
    
    return {
      status: m.status_label,
      produto: m.product_name,
      categoria: m.refined_category ?? '—',
      vendas_90d: vendasText,
      ultima_venda: ultimaVendaText,
      capital_preso: capitalText,
      custo_mensal: custoMensalText,
      tendencia: formatTrend(m.forecast_trend),
      recomendacao: m.recommendation
    }
  })
  
  return { chartType: 'table', chartData: rows }
}

export type ChartQuery =
  | { type: 'forecast'; days?: number }
  | { type: 'line'; days?: number }
  | { type: 'supply_chain'; urgency_filter?: string }
  | { type: 'alertas' }
  | { type: 'pareto'; period_days?: number; view?: string }
  | { type: 'dead_stock'; filter?: string }

/**
 * Gera dados de gráfico conforme a query.
 */
export async function generateChartData(
  supabase: SupabaseClient,
  userId: string,
  query: ChartQuery
): Promise<ChartOutput | null> {
  const days = query.type === 'forecast' || query.type === 'line' ? (query.days ?? DEFAULT_DAYS) : 0
  switch (query.type) {
    case 'forecast':
      return forecastChart(supabase, userId, days)
    case 'line':
      return lineChart(supabase, userId, days)
    case 'supply_chain':
      return supplyChainTable(supabase, userId, query.urgency_filter)
    case 'alertas':
      return alertasTable(supabase, userId)
    case 'pareto':
      return paretoTable(supabase, userId, query.period_days, query.view)
    case 'dead_stock':
      return deadStockTable(supabase, userId, query.filter)
    default:
      return null
  }
}
