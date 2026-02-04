/**
 * Analytics Engine – tipos unificados (blueprint).
 * Um único schema de análise para Dashboard, Chat e API.
 */

export type AnalysisType = 'forecast' | 'historical' | 'scenario' | 'recommendation'
export type AnalysisMetric = 'units' | 'revenue' | 'margin' | 'stock_level' | 'sell_through'
export type AnalysisEntity = 'store' | 'category' | 'product' | 'variant'

export interface AnalysisRequest {
  analysisType: AnalysisType
  metric?: AnalysisMetric
  entity?: AnalysisEntity
  entityId?: string
  entityValue?: string
  /** Para forecast: ID da análise (upload). */
  analysisId?: string
  timeframe?: {
    startDate?: string
    endDate?: string
    horizonDays?: number[]
  }
  filters?: {
    categories?: string[]
    priceRange?: { min: number; max: number }
    [key: string]: unknown
  }
  scenario?: {
    type: 'promotion' | 'price_change' | 'supply_disruption'
    parameters: Record<string, unknown>
  }
  includeConfidence?: boolean
}

export interface AnalysisResult {
  data: unknown
  summary?: {
    current?: number
    predicted?: number
    change?: number
    changePercent?: number
  }
  confidence?: {
    dataQuality: number
    forecastConfidence?: number
    factors?: {
      historicalConsistency?: number
      externalFactors?: number
      dataCompleteness?: number
    }
  }
  recommendations?: unknown[]
  warnings?: string[]
}
