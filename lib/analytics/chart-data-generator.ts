/**
 * Chart Data Generator – produz dados para gráficos no chat.
 * Usa sales, forecasts e KPIs do dashboard.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getSalesByDate,
  getForecastsByDate,
  getDashboardKpis
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

function formatUrgency(level: string): string {
  switch(level) {
    case 'critical': return '🔴 Crítico'
    case 'attention': return '🟡 Atenção'
    case 'informative': return '🔵 Informativo'
    default: return '🟢 OK'
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

export type ChartQuery =
  | { type: 'forecast'; days?: number }
  | { type: 'line'; days?: number }
  | { type: 'supply_chain'; urgency_filter?: string }
  | { type: 'alertas' }

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
    default:
      return null
  }
}
