-- Add sku column to products (optional; from CSV "Sku" column)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku TEXT;

COMMENT ON COLUMN public.products.sku IS 'SKU/código único do produto (ex: CSV "Sku"). original_name passa a ser o nome descritivo (ex: Product name).';
