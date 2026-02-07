/**
 * Supply Chain Intelligence - Reorder Point + MOQ
 * 
 * Calcula métricas de supply chain em tempo real:
 * - Reorder Point (ROP)
 * - Days until stockout
 * - Urgency levels (critical/attention/informative/ok)
 * - MOQ alerts
 * - Recommended order quantities
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays } from 'date-fns'

export interface SupplyChainMetrics {
  product_id: string
  product_name: string
  current_stock: number | null
  avg_daily_demand: number | null
  lead_time_days: number
  safety_stock_days: number
  safety_stock_units: number | null  // avg_daily_demand × safety_stock_days
  reorder_point: number | null       // (avg_daily_demand × lead_time_days) + safety_stock_units
  days_until_stockout: number | null // current_stock / avg_daily_demand
  stockout_date: string | null       // hoje + days_until_stockout
  urgency_level: 'critical' | 'attention' | 'informative' | 'ok'
  urgency_reason: string
  moq: number
  recommended_order_qty: number | null
  moq_alert: string | null          // ex: "MOQ é 500, consumo 90d é 300"
  supplier_name: string | null
  supplier_id: string | null
  analysis_id: string
}

interface UrgencyResult {
  level: 'critical' | 'attention' | 'informative' | 'ok'
  reason: string
}

const MAX_PRODUCTS_PER_QUERY = 500

/**
 * Calcula nível de urgência baseado em dias até ruptura e lead time
 */
function calculateUrgency(
  daysUntilStockout: number | null,
  leadTimeDays: number
): UrgencyResult {
  
  if (daysUntilStockout === null) {
    return { 
      level: 'ok', 
      reason: 'Dados insuficientes para calcular urgência' 
    }
  }
  
  if (daysUntilStockout <= 0) {
    return { 
      level: 'critical', 
      reason: 'Produto já está sem estoque' 
    }
  }
  
  if (daysUntilStockout < leadTimeDays) {
    // Mesmo pedindo HOJE, vai ter ruptura
    const gapDays = leadTimeDays - daysUntilStockout
    return { 
      level: 'critical', 
      reason: `Ruptura inevitável: mesmo pedindo hoje, ficará ${gapDays} dias sem estoque` 
    }
  }
  
  if (daysUntilStockout < leadTimeDays + 7) {
    // Janela de pedido está fechando
    const daysToDecide = daysUntilStockout - leadTimeDays
    return { 
      level: 'attention', 
      reason: `Janela de pedido: ${daysToDecide} dias para fazer pedido sem ruptura` 
    }
  }
  
  if (daysUntilStockout < leadTimeDays + 14) {
    return { 
      level: 'informative', 
      reason: `Estoque confortável por ~${daysUntilStockout} dias. Monitorar.` 
    }
  }
  
  return { 
    level: 'ok', 
    reason: `Estoque para ${daysUntilStockout} dias. Situação confortável.` 
  }
}

/**
 * Gera alerta sobre MOQ se aplicável
 */
function generateMoqAlert(
  rawOrderQty: number | null,
  moq: number,
  consumption90d: number | null,
  avgDailyDemand: number | null
): string | null {
  if (rawOrderQty === null || consumption90d === null || avgDailyDemand === null) return null
  if (avgDailyDemand <= 0) return null
  
  if (rawOrderQty < moq && rawOrderQty > 0) {
    const monthsOfStock = Math.round((moq / avgDailyDemand) / 30)
    return `MOQ é ${moq}, mas você só precisa de ${rawOrderQty} un. ` +
           `Comprar ${moq} = ~${monthsOfStock} meses de estoque. ` +
           `Considere negociar MOQ menor ou aceitar o excesso.`
  }
  
  if (consumption90d < moq) {
    const monthsOfStock = Math.round((moq / avgDailyDemand) / 30)
    return `MOQ (${moq}) é maior que seu consumo de 90 dias (${consumption90d}). ` +
           `O pedido mínimo cobre ~${monthsOfStock} meses.`
  }
  
  return null
}

/**
 * Ordena métricas por urgência (critical primeiro)
 */
function sortByUrgency(a: SupplyChainMetrics, b: SupplyChainMetrics): number {
  const urgencyOrder = { critical: 0, attention: 1, informative: 2, ok: 3 }
  const orderA = urgencyOrder[a.urgency_level]
  const orderB = urgencyOrder[b.urgency_level]
  
  if (orderA !== orderB) {
    return orderA - orderB
  }
  
  // Dentro do mesmo nível, ordenar por dias até ruptura (menor primeiro)
  const daysA = a.days_until_stockout ?? 9999
  const daysB = b.days_until_stockout ?? 9999
  return daysA - daysB
}

/**
 * Busca análise mais recente do usuário
 */
async function getLatestAnalysis(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('analyses')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[supply-chain] getLatestAnalysis:', error.message)
    return null
  }
  return data?.id ?? null
}

/**
 * Busca defaults de lead time e MOQ da organização
 */
async function getOrgDefaults(
  supabase: SupabaseClient,
  userId: string
): Promise<{ defaultLeadTimeDays: number; defaultMoq: number }> {
  const { data: profetaUser } = await supabase
    .from('profeta_users')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle()

  let defaultLeadTimeDays = 30
  let defaultMoq = 100

  if (profetaUser?.organization_id) {
    const { data: settings } = await supabase
      .from('settings')
      .select('default_lead_time_days, default_moq')
      .eq('organization_id', profetaUser.organization_id)
      .maybeSingle()

    if (settings) {
      defaultLeadTimeDays = settings.default_lead_time_days ?? 30
      defaultMoq = settings.default_moq ?? 100
    }
  }

  return { defaultLeadTimeDays, defaultMoq }
}

/**
 * Calcula métricas de supply chain em tempo real para todos os produtos
 */
export async function getSupplyChainMetrics(
  supabase: SupabaseClient,
  userId: string
): Promise<SupplyChainMetrics[]> {
  // 1. Buscar análise mais recente
  const analysisId = await getLatestAnalysis(supabase, userId)
  if (!analysisId) return []

  // 2. Buscar defaults da organização
  const { defaultLeadTimeDays, defaultMoq } = await getOrgDefaults(supabase, userId)

  // 3. Buscar produtos com seus suppliers (JOIN)
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      id,
      cleaned_name,
      original_name,
      current_stock,
      avg_daily_demand,
      safety_stock_days,
      supplier_id,
      analysis_id,
      suppliers:supplier_id (
        id,
        name,
        lead_time_days,
        moq
      )
    `)
    .eq('analysis_id', analysisId)
    .limit(MAX_PRODUCTS_PER_QUERY)

  if (productsError || !products?.length) {
    if (productsError) {
      console.error('[supply-chain] getSupplyChainMetrics products:', productsError.message)
    }
    return []
  }

  // 4. Para cada produto, calcular métricas
  const metrics: SupplyChainMetrics[] = products.map((product: any) => {
    const stock = product.current_stock
    const avgDemand = product.avg_daily_demand ? Number(product.avg_daily_demand) : null
    const supplier = Array.isArray(product.suppliers) ? product.suppliers[0] : product.suppliers
    const leadTime = supplier?.lead_time_days ?? defaultLeadTimeDays
    const safetyDays = product.safety_stock_days ?? 7
    const moq = supplier?.moq ?? defaultMoq
    const productName = (product.cleaned_name ?? product.original_name ?? 'Produto').trim() || 'Produto'

    // Safety stock em unidades
    const safetyStockUnits = avgDemand ? Math.ceil(avgDemand * safetyDays) : null

    // Reorder Point
    const reorderPoint = avgDemand 
      ? Math.ceil((avgDemand * leadTime) + (safetyStockUnits ?? 0))
      : null

    // Days until stockout
    const daysUntilStockout = (stock != null && avgDemand && avgDemand > 0)
      ? Math.floor(stock / avgDemand)
      : null

    // Stockout date
    const stockoutDate = daysUntilStockout != null
      ? addDays(new Date(), daysUntilStockout).toISOString().split('T')[0]
      : null

    // Urgency level
    const urgency = calculateUrgency(daysUntilStockout, leadTime)

    // Recommended order quantity (consumo projetado 90d - estoque atual)
    const consumption90d = avgDemand ? Math.ceil(avgDemand * 90) : null
    const rawOrderQty = (consumption90d != null && stock != null)
      ? Math.max(consumption90d - stock, 0)
      : null

    // MOQ alert
    const moqAlert = generateMoqAlert(rawOrderQty, moq, consumption90d, avgDemand)

    // Adjust to MOQ (no mínimo o MOQ)
    const recommendedOrderQty = rawOrderQty != null
      ? Math.max(rawOrderQty, moq)
      : null

    return {
      product_id: product.id,
      product_name: productName,
      current_stock: stock != null ? Number(stock) : null,
      avg_daily_demand: avgDemand,
      lead_time_days: leadTime,
      safety_stock_days: safetyDays,
      safety_stock_units: safetyStockUnits,
      reorder_point: reorderPoint,
      days_until_stockout: daysUntilStockout,
      stockout_date: stockoutDate,
      urgency_level: urgency.level,
      urgency_reason: urgency.reason,
      moq: moq,
      recommended_order_qty: recommendedOrderQty,
      moq_alert: moqAlert,
      supplier_name: supplier?.name ?? null,
      supplier_id: supplier?.id ?? null,
      analysis_id: product.analysis_id
    }
  })

  // 5. Ordenar por urgência (critical primeiro)
  return metrics.sort(sortByUrgency)
}
