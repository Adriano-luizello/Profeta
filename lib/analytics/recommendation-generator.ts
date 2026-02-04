/**
 * Recommendation Generator – consumir forecasts + supply chain e gerar recomendações.
 * Blueprint Fase 2: reorder, stockout, etc.
 */

import {
  type SupplyChainParams,
  mapSettingsToParams,
  computeSupplyChain
} from './supply-chain-calculator'

export interface RecommendationInput {
  productId: string
  productName: string
  /** Demanda média diária (ex.: dos próximos 30d de forecast). */
  avgDailyDemand: number
  /** Estoque atual, se disponível. */
  currentStock?: number | null
  /** Settings por org; opcional se passar em generateRecommendations(..., settings). */
  settings?: Parameters<typeof mapSettingsToParams>[0]
}

export interface GeneratedRecommendation {
  productId: string
  productName: string
  action: 'restock' | 'maintain' | 'reduce' | 'urgent_restock'
  recommendedQuantity: number | null
  reasoning: string
  reorderPoint: number
  safetyStock: number
  suggestedOrderQty: number
  /** Alerta se sugerimos pedir agora (restock/urgent). */
  isAlert: boolean
  /** Prioridade para UI: high = pedir HOJE, medium = próximos dias. */
  priority: 'high' | 'medium' | 'low'
}

/**
 * Gera recomendações a partir de forecast + supply chain.
 * Usa stockout_warning_days para marcar alertas (prioridade high quando restock urgente).
 */
export function generateRecommendations(
  inputs: RecommendationInput[],
  settings?: Parameters<typeof mapSettingsToParams>[0]
): GeneratedRecommendation[] {
  const s = settings ?? inputs[0]?.settings ?? {}
  const p = mapSettingsToParams(s) as SupplyChainParams
  const out: GeneratedRecommendation[] = []

  for (const i of inputs) {
    const sc = computeSupplyChain(i.avgDailyDemand, p, i.currentStock ?? null)

    const needsReorder =
      sc.suggestedOrderQty >= p.moq &&
      (i.currentStock == null || i.currentStock < sc.reorderPoint)
    const action = needsReorder
      ? (i.currentStock != null && i.currentStock < p.moq ? 'urgent_restock' : 'restock')
      : 'maintain'

    const reasoning = needsReorder
      ? `Demanda média ${sc.avgDailyDemand.toFixed(1)}/dia. Ponto de recompra ${sc.reorderPoint} un, estoque de segurança ${sc.safetyStock} un. Sugestão: pedir ${sc.suggestedOrderQty} un (MOQ ${p.moq}).`
      : `Estoque dentro do esperado. Ponto de recompra ${sc.reorderPoint} un.`

    const isAlert = action === 'urgent_restock' || (action === 'restock' && needsReorder)
    const priority: GeneratedRecommendation['priority'] =
      action === 'urgent_restock' ? 'high' : needsReorder ? 'medium' : 'low'

    out.push({
      productId: i.productId,
      productName: i.productName,
      action,
      recommendedQuantity: needsReorder ? sc.suggestedOrderQty : null,
      reasoning,
      reorderPoint: sc.reorderPoint,
      safetyStock: sc.safetyStock,
      suggestedOrderQty: sc.suggestedOrderQty,
      isAlert,
      priority
    })
  }

  return out
}
