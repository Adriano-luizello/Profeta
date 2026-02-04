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
 */
async function supplyChainTable(
  supabase: SupabaseClient,
  userId: string
): Promise<ChartOutput> {
  const kpis = await getDashboardKpis(supabase, userId)
  const rows = kpis.produtosEmRiscoList.map((p) => ({
    produto: p.product_name,
    estoque: p.current_stock != null ? String(p.current_stock) : '—',
    recomendação: p.recommended_quantity != null ? `Pedir ${p.recommended_quantity} un` : 'Ver análise',
    risco: p.risk_level === 'high' ? 'Alto' : p.risk_level === 'medium' ? 'Médio' : 'Baixo'
  }))
  return { chartType: 'table', chartData: rows }
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
  | { type: 'supply_chain' }
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
      return supplyChainTable(supabase, userId)
    case 'alertas':
      return alertasTable(supabase, userId)
    default:
      return null
  }
}
