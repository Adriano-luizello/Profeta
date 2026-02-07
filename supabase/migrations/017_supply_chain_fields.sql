-- ============================================
-- Supply Chain Intelligence - Reorder Point + MOQ
-- ============================================

-- avg_daily_demand: calculado pelo Python durante o pipeline
-- Representa a demanda diária média derivada do forecast
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS avg_daily_demand DECIMAL(10, 4);

COMMENT ON COLUMN public.products.avg_daily_demand IS 
  'Demanda diária média calculada a partir dos forecasts. Atualizada pelo Python após gerar forecast.';

-- safety_stock_days: configurável pelo usuário
-- Significa "quero sempre ter N dias de estoque de segurança"
-- O safety_stock em unidades = avg_daily_demand × safety_stock_days
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS safety_stock_days INTEGER DEFAULT 7;

COMMENT ON COLUMN public.products.safety_stock_days IS 
  'Dias de estoque de segurança desejados. Safety stock em unidades = avg_daily_demand × safety_stock_days. Default: 7 dias.';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_products_avg_daily_demand ON public.products(avg_daily_demand) 
  WHERE avg_daily_demand IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_safety_stock_days ON public.products(safety_stock_days) 
  WHERE safety_stock_days IS NOT NULL;
