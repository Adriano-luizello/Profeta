-- Estoque atual por produto (opcional). Preenchido via CSV (coluna stock/estoque) ou manualmente.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS current_stock INTEGER;

COMMENT ON COLUMN public.products.current_stock IS 'Estoque atual em unidades. Opcional; vem do CSV (stock/estoque) ou ajuste manual.';
