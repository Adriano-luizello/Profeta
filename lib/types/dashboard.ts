export type TimeHorizon = 30 | 60 | 90;

export type ModelType = 'prophet' | 'xgboost' | 'ensemble';

export type ProductStatus = 'critical' | 'attention' | 'ok' | 'unknown';

export interface DashboardSummary {
  total_forecast: number;
  forecast_change_pct: number;
  avg_confidence: number;
  avg_mape: number;
  avg_prophet_mape: number;
  improvement_vs_prophet: number;
  predominant_model: ModelType;
}

export interface ProductAction {
  product_id: string;
  product_name: string;
  reason: string;
  actions: string[];
}

export interface DashboardActions {
  critical: ProductAction[];
  attention: ProductAction[];
  opportunity: ProductAction[];
  counts: {
    critical: number;
    attention: number;
    opportunity: number;
  };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  forecast: number[];
  forecast_total: number;
  forecast_model: ModelType;
  forecast_confidence: number;
  forecast_reason: string;
  forecast_weights?: {
    xgboost: number;
    prophet: number;
  };
  xgboost_mape?: number;
  prophet_mape?: number;
  displayed_mape?: number;
  xgboost_mae?: number;
  status: ProductStatus;
  status_reason: string;
  actions: string[];
  worst_score?: number;
  current_stock: number;
  avg_daily_sales: number;
}

export interface DashboardData {
  analysis_id: string;
  time_horizon: TimeHorizon;
  generated_at: string;
  summary: DashboardSummary;
  actions: DashboardActions;
  top_best: Product[];
  top_worst: Product[];
  all_products: Product[];
}
