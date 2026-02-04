/**
 * Tipos para dados limpos e enriquecidos com IA
 */

export interface Anomaly {
  type: 'spelling_error' | 'missing_data' | 'outlier' | 'inconsistency' | 'data_quality'
  field: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
}

export interface CleanedProductData {
  // Dados limpos e padronizados
  cleaned_name: string
  refined_category: string
  
  // Atributos extraídos/inferidos
  attributes: {
    [key: string]: string | number
  }
  
  // Sazonalidade identificada
  seasonality: string
  
  // Métricas
  expected_return_rate: number // 0.0 a 1.0
  data_quality_score: number   // 0 a 100
  
  // Anomalias detectadas
  anomalies_detected: Anomaly[]
  
  // Metadados da IA
  ai_confidence: number // 0.0 a 1.0
  reasoning: string
}

export interface CleaningJobResult {
  analysis_id: string
  total_products: number
  cleaned_count: number
  failed_count: number
  stats: {
    average_quality_score: number
    average_confidence: number
    total_anomalies: number
    categories_found: string[]
  }
  cost_usd: number
  duration_seconds: number
}
