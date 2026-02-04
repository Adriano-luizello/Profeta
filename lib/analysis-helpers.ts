/**
 * Helpers para a página de análise: agregar dados, top/worst, alertas.
 */

import type {
  ForecastResponse,
  ProductForecast,
  HistoricalDataPoint,
  ForecastDataPoint,
} from '@/types/forecasting'

function sumByDate<T extends { date: string }>(
  items: T[],
  getQuantity: (item: T) => number
): { date: string; quantity: number }[] {
  const byDate = new Map<string, number>()
  for (const item of items) {
    const d = item.date.split('T')[0]
    byDate.set(d, (byDate.get(d) ?? 0) + getQuantity(item))
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, quantity]) => ({ date: date + 'T00:00:00.000Z', quantity }))
}

export function getAggregatedChartData(forecast: ForecastResponse): {
  historical: HistoricalDataPoint[]
  forecast30d: ForecastDataPoint[]
  forecast60d: ForecastDataPoint[]
  forecast90d: ForecastDataPoint[]
} {
  if (!forecast.product_forecasts?.length) {
    return { historical: [], forecast30d: [], forecast60d: [], forecast90d: [] }
  }

  const allHistorical: { date: string; quantity: number }[] = []
  for (const pf of forecast.product_forecasts) {
    for (const h of pf.historical_data ?? []) {
      allHistorical.push({ date: h.date, quantity: h.quantity })
    }
  }
  const historicalAgg = sumByDate(allHistorical, (x) => x.quantity)
  const historical: HistoricalDataPoint[] = historicalAgg.map((x) => ({
    date: x.date,
    quantity: x.quantity,
  }))

  const agg30 = sumByDate(
    forecast.product_forecasts.flatMap((pf) => pf.forecast_30d ?? []),
    (x: ForecastDataPoint) => x.predicted_quantity
  )
  const forecast30d: ForecastDataPoint[] = agg30.map((x) => ({
    date: x.date,
    predicted_quantity: x.quantity,
    lower_bound: x.quantity * 0.8,
    upper_bound: x.quantity * 1.2,
  }))

  const agg60 = sumByDate(
    forecast.product_forecasts.flatMap((pf) => pf.forecast_60d ?? []),
    (x: ForecastDataPoint) => x.predicted_quantity
  )
  const forecast60d: ForecastDataPoint[] = agg60.map((x) => ({
    date: x.date,
    predicted_quantity: x.quantity,
    lower_bound: x.quantity * 0.8,
    upper_bound: x.quantity * 1.2,
  }))

  const agg90 = sumByDate(
    forecast.product_forecasts.flatMap((pf) => pf.forecast_90d ?? []),
    (x: ForecastDataPoint) => x.predicted_quantity
  )
  const forecast90d: ForecastDataPoint[] = agg90.map((x) => ({
    date: x.date,
    predicted_quantity: x.quantity,
    lower_bound: x.quantity * 0.8,
    upper_bound: x.quantity * 1.2,
  }))

  return { historical, forecast30d, forecast60d, forecast90d }
}

export function getCategoryChartData(
  forecast: ForecastResponse,
  category: string
): {
  historical: HistoricalDataPoint[]
  forecast30d: ForecastDataPoint[]
  forecast60d: ForecastDataPoint[]
  forecast90d: ForecastDataPoint[]
} {
  if (!forecast.product_forecasts?.length) {
    return { historical: [], forecast30d: [], forecast60d: [], forecast90d: [] }
  }
  const filtered =
    category === 'all'
      ? forecast.product_forecasts
      : forecast.product_forecasts.filter((pf) => pf.category === category)
  if (!filtered.length) {
    return { historical: [], forecast30d: [], forecast60d: [], forecast90d: [] }
  }
  const pseudo: ForecastResponse = {
    ...forecast,
    product_forecasts: filtered,
  }
  return getAggregatedChartData(pseudo)
}

export function totalForecastForPeriod(
  pf: ProductForecast,
  period: 30 | 60 | 90
): number {
  const key = `forecast_${period}d` as 'forecast_30d' | 'forecast_60d' | 'forecast_90d'
  const arr = pf[key] ?? []
  return arr.reduce((s, d) => s + d.predicted_quantity, 0)
}

export function getTopProducts(
  forecast: ForecastResponse,
  n: number,
  period: 30 | 60 | 90 = 30
): ProductForecast[] {
  if (!forecast.product_forecasts?.length) return []
  return [...forecast.product_forecasts]
    .sort((a, b) => totalForecastForPeriod(b, period) - totalForecastForPeriod(a, period))
    .slice(0, n)
}

export function getWorstProducts(
  forecast: ForecastResponse,
  n: number,
  period: 30 | 60 | 90 = 30
): ProductForecast[] {
  if (!forecast.product_forecasts?.length) return []
  return [...forecast.product_forecasts]
    .sort((a, b) => totalForecastForPeriod(a, period) - totalForecastForPeriod(b, period))
    .slice(0, n)
}

export interface AlertItem {
  product_id: string
  product_name: string
  category: string
  suggested_quantity: number | null
  restock_date: string | null
  reasoning: string
}

export function calculateAlerts(forecast: ForecastResponse): AlertItem[] {
  if (!forecast.product_forecasts?.length) return []
  return forecast.product_forecasts
    .filter((pf) => pf.recommendations.suggested_quantity != null && pf.recommendations.suggested_quantity > 0)
    .map((pf) => ({
      product_id: pf.product_id,
      product_name: pf.product_name,
      category: pf.category,
      suggested_quantity: pf.recommendations.suggested_quantity,
      restock_date: pf.recommendations.restock_date,
      reasoning: pf.recommendations.reasoning,
    }))
}

export function calculateTotalSales(forecast: ForecastResponse): number {
  if (!forecast.product_forecasts?.length) return 0
  let total = 0
  for (const pf of forecast.product_forecasts) {
    for (const h of pf.historical_data ?? []) {
      total += h.quantity
    }
  }
  return total
}

export function calculateAverageMAPE(forecast: ForecastResponse): number | null {
  if (!forecast.product_forecasts?.length) return null
  const withMape = forecast.product_forecasts.filter(
    (pf) => pf.metrics.mape != null && pf.metrics.mape > 0
  )
  if (!withMape.length) return null
  const sum = withMape.reduce((s, pf) => s + (pf.metrics.mape ?? 0), 0)
  return Math.round((sum / withMape.length) * 10) / 10
}
