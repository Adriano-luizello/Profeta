-- ============================================
-- FASE 2: XGBoost Feature Store & Forecasts
-- ============================================

-- 1. Feature Store: armazena features calculadas por produto/mês
CREATE TABLE IF NOT EXISTS public.feature_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

  -- Data da feature (mês de referência)
  feature_date DATE NOT NULL,

  -- Lag Features (vendas meses anteriores)
  lag_1 NUMERIC,  -- Vendas mês anterior
  lag_3 NUMERIC,  -- Vendas 3 meses atrás
  lag_6 NUMERIC,  -- Vendas 6 meses atrás
  lag_12 NUMERIC, -- Vendas 12 meses atrás

  -- Rolling Statistics
  rolling_mean_3m NUMERIC,  -- Média móvel 3 meses
  rolling_mean_6m NUMERIC,  -- Média móvel 6 meses
  rolling_std_3m NUMERIC,   -- Desvio padrão 3 meses
  rolling_min_3m NUMERIC,   -- Mínimo 3 meses
  rolling_max_3m NUMERIC,   -- Máximo 3 meses

  -- Seasonality Features
  month INTEGER,           -- Mês (1-12)
  quarter INTEGER,         -- Trimestre (1-4)
  is_holiday BOOLEAN,      -- É mês de feriado importante
  is_peak_season BOOLEAN,  -- É temporada alta (Nov/Dez)

  -- Trend Features
  linear_trend NUMERIC,    -- Tendência linear calculada
  momentum NUMERIC,        -- Momento (crescimento recente)

  -- Product Attributes (desnormalizadas para ML)
  category TEXT,
  brand TEXT,
  cluster TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(product_id, feature_date)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_feature_store_product ON public.feature_store(product_id);
CREATE INDEX IF NOT EXISTS idx_feature_store_date ON public.feature_store(feature_date);
CREATE INDEX IF NOT EXISTS idx_feature_store_analysis ON public.feature_store(analysis_id);

---

-- 2. Forecasts XGBoost: previsões do modelo XGBoost
CREATE TABLE IF NOT EXISTS public.forecasts_xgboost (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

  -- Data da previsão
  forecast_date DATE NOT NULL,

  -- Previsão
  predicted_quantity NUMERIC NOT NULL,

  -- Intervalos de confiança (percentis)
  lower_bound NUMERIC,  -- Percentil 10
  upper_bound NUMERIC,  -- Percentil 90

  -- Confiança do modelo
  confidence_score NUMERIC,  -- 0-1 (baseado em feature importance)

  -- Metadata do modelo
  model_version TEXT,
  features_used JSONB,  -- Lista de features usadas

  -- Métricas (quando disponível)
  actual_quantity NUMERIC,  -- Valor real (para validação)
  error NUMERIC,            -- Erro absoluto

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(product_id, forecast_date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_forecasts_xgboost_product ON public.forecasts_xgboost(product_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_xgboost_date ON public.forecasts_xgboost(forecast_date);
CREATE INDEX IF NOT EXISTS idx_forecasts_xgboost_analysis ON public.forecasts_xgboost(analysis_id);

---

-- 3. Model Metadata: armazena info dos modelos treinados
CREATE TABLE IF NOT EXISTS public.model_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

  -- Tipo de modelo
  model_type TEXT NOT NULL, -- 'prophet', 'xgboost', 'ensemble'

  -- Métricas de performance
  mape NUMERIC,
  mae NUMERIC,
  rmse NUMERIC,
  r2_score NUMERIC,

  -- Hiperparâmetros (XGBoost)
  hyperparameters JSONB,

  -- Feature importance (XGBoost)
  feature_importance JSONB,

  -- Modelo serializado (pickle base64 ou path)
  model_path TEXT,

  -- Training info
  training_samples INTEGER,
  validation_samples INTEGER,
  training_date TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(product_id, model_type)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_model_metadata_product ON public.model_metadata(product_id);
CREATE INDEX IF NOT EXISTS idx_model_metadata_type ON public.model_metadata(model_type);

---

-- 4. Materialized View: Latest Features por Produto (IF NOT EXISTS requer PG 16+)
CREATE MATERIALIZED VIEW public.latest_features AS
SELECT
  fs.product_id,
  MAX(fs.feature_date) AS latest_date,
  (SELECT f2.lag_1 FROM public.feature_store f2 WHERE f2.product_id = fs.product_id ORDER BY f2.feature_date DESC LIMIT 1) AS lag_1,
  (SELECT f2.rolling_mean_6m FROM public.feature_store f2 WHERE f2.product_id = fs.product_id ORDER BY f2.feature_date DESC LIMIT 1) AS rolling_mean_6m
FROM public.feature_store fs
GROUP BY fs.product_id;

-- Índice
CREATE UNIQUE INDEX IF NOT EXISTS idx_latest_features_product ON public.latest_features(product_id);

---

-- 5. Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para feature_store
DROP TRIGGER IF EXISTS update_feature_store_updated_at ON public.feature_store;
CREATE TRIGGER update_feature_store_updated_at
  BEFORE UPDATE ON public.feature_store
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
