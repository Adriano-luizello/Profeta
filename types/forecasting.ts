/**
 * Tipos TypeScript para Forecasting com Prophet
 * Sincronizado com schemas Python
 */

export interface ForecastDataPoint {
  date: string // ISO date string
  predicted_quantity: number
  lower_bound: number // Intervalo de confiança 80%
  upper_bound: number
}

export interface HistoricalDataPoint {
  date: string // ISO date string
  quantity: number
}

export interface ForecastMetrics {
  mape: number | null // Mean Absolute Percentage Error
  rmse: number | null // Root Mean Squared Error
  mae: number | null // Mean Absolute Error
  trend: 'increasing' | 'decreasing' | 'stable'
  seasonality_strength: number // 0.0 - 1.0
  accuracy_level?: string // excellent | good | needs_improvement | insufficient_data | ...
  sample_size?: number // pontos usados no backtesting
}

export interface ForecastRecommendations {
  restock_date: string | null // ISO date string
  suggested_quantity: number | null
  confidence: number // 0.0 - 1.0
  reasoning: string
}

export interface ProductForecast {
  product_id: string
  product_name: string
  category: string
  
  historical_data: HistoricalDataPoint[]
  
  forecast_30d: ForecastDataPoint[]
  forecast_60d: ForecastDataPoint[]
  forecast_90d: ForecastDataPoint[]
  
  metrics: ForecastMetrics
  recommendations: ForecastRecommendations
}

export interface CategoryForecast {
  category: string
  product_count: number
  
  historical_data: HistoricalDataPoint[]
  
  forecast_30d: ForecastDataPoint[]
  forecast_60d: ForecastDataPoint[]
  forecast_90d: ForecastDataPoint[]
  
  metrics: ForecastMetrics
}

export interface ForecastResponse {
  analysis_id: string
  created_at: string // ISO date string
  
  // Forecast por produto
  product_forecasts: ProductForecast[] | null
  
  // Forecast por categoria
  category_forecasts: CategoryForecast[] | null
  
  // Estatísticas gerais
  stats: {
    total_products: number
    categories: number
    forecast_horizons: number[]
    generated_at: string
    [key: string]: any
  }
}

export interface ForecastRequest {
  analysis_id: string
  forecast_days?: number[] // Default: [30, 60, 90]
  by_product?: boolean // Default: true
  by_category?: boolean // Default: true
}

export interface ForecastError {
  detail: string
  analysis_id?: string
}

// Estado do componente de forecast
export interface ForecastState {
  loading: boolean
  error: string | null
  data: ForecastResponse | null
  progress: number // 0-100
}

// Para seleção de horizonte no UI
export type ForecastHorizon = '30d' | '60d' | '90d'

// Para tipo de visualização
export type ForecastViewType = 'chart' | 'table' | 'recommendations'
