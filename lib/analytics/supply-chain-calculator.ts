/**
 * Supply Chain Calculator – reorder point, safety stock, MOQ.
 * Usa settings (lead time, MOQ, safety_stock_multiplier) conforme blueprint Fase 2.
 */

export interface SupplyChainParams {
  leadTimeDays: number
  moq: number
  safetyStockMultiplier: number
  stockoutWarningDays: number
}

export interface SupplyChainResult {
  /** Estoque de segurança (unidades). */
  safetyStock: number
  /** Ponto de reordenamento = demanda durante lead time + safety stock. */
  reorderPoint: number
  /** Quantidade sugerida arredondada para cima ao MOQ. */
  suggestedOrderQty: number
  /** Demanda média diária usada no cálculo. */
  avgDailyDemand: number
}

/**
 * Calcula estoque de segurança: avgDailyDemand * leadTime * (multiplier - 1).
 * Com multiplier 1.5 → 50% de buffer sobre demanda no lead time.
 */
export function computeSafetyStock(
  avgDailyDemand: number,
  leadTimeDays: number,
  safetyStockMultiplier: number
): number {
  if (avgDailyDemand <= 0 || leadTimeDays <= 0) return 0
  const extra = Math.max(0, safetyStockMultiplier - 1)
  return Math.round(avgDailyDemand * leadTimeDays * extra)
}

/**
 * Ponto de reordenamento = demanda durante lead time + safety stock.
 */
export function computeReorderPoint(
  avgDailyDemand: number,
  leadTimeDays: number,
  safetyStock: number
): number {
  const demandDuringLeadTime = Math.round(avgDailyDemand * leadTimeDays)
  return demandDuringLeadTime + safetyStock
}

/**
 * Arredonda a quantidade sugerida para cima ao múltiplo do MOQ.
 * Mínimo = MOQ.
 */
export function roundUpToMoq(qty: number, moq: number): number {
  if (moq <= 0) return Math.max(0, Math.round(qty))
  if (qty <= 0) return moq
  const mult = Math.ceil(qty / moq)
  return mult * moq
}

/**
 * Dado demanda média diária, params da org e (opcional) estoque atual,
 * retorna safety stock, reorder point e sugestão de pedido.
 */
export function computeSupplyChain(
  avgDailyDemand: number,
  params: SupplyChainParams,
  currentStock: number | null
): SupplyChainResult {
  const safety = computeSafetyStock(
    avgDailyDemand,
    params.leadTimeDays,
    params.safetyStockMultiplier
  )
  const reorder = computeReorderPoint(avgDailyDemand, params.leadTimeDays, safety)
  let rawQty = reorder
  if (currentStock != null && currentStock < reorder) {
    rawQty = reorder - currentStock
  }
  const suggested = roundUpToMoq(rawQty, params.moq)
  return {
    safetyStock: safety,
    reorderPoint: reorder,
    suggestedOrderQty: Math.max(params.moq, suggested),
    avgDailyDemand
  }
}

/**
 * Mapeia settings do Supabase para SupplyChainParams.
 */
export function mapSettingsToParams(settings: {
  default_lead_time_days?: number | null
  default_moq?: number | null
  default_safety_stock_multiplier?: number | null
  stockout_warning_days?: number | null
}): SupplyChainParams {
  return {
    leadTimeDays: settings.default_lead_time_days ?? 30,
    moq: settings.default_moq ?? 100,
    safetyStockMultiplier: Number(settings.default_safety_stock_multiplier) || 1.5,
    stockoutWarningDays: settings.stockout_warning_days ?? 14
  }
}
