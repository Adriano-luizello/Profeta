-- Query de debug: verificar dados para análise Pareto
-- Execute no Supabase SQL Editor para validar dados

-- 1. Verificar produtos com preço
SELECT 
  COUNT(*) as total_products,
  COUNT(price) as products_with_price,
  COUNT(current_stock) as products_with_stock
FROM products
WHERE analysis_id IN (
  SELECT id FROM analyses 
  WHERE status = 'completed' 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- 2. Verificar vendas nos últimos 90 dias
SELECT 
  COUNT(*) as total_sales,
  COUNT(DISTINCT product_id) as products_with_sales,
  MIN(date) as oldest_sale,
  MAX(date) as newest_sale,
  SUM(quantity) as total_quantity,
  SUM(revenue) as total_revenue
FROM sales_history
WHERE product_id IN (
  SELECT id FROM products
  WHERE analysis_id IN (
    SELECT id FROM analyses 
    WHERE status = 'completed' 
    ORDER BY created_at DESC 
    LIMIT 1
  )
)
AND date >= CURRENT_DATE - INTERVAL '90 days';

-- 3. Top 5 produtos por receita (preview do Pareto)
WITH product_sales AS (
  SELECT 
    p.id,
    p.cleaned_name,
    p.price,
    COALESCE(SUM(sh.revenue), SUM(sh.quantity * p.price)) as total_revenue
  FROM products p
  LEFT JOIN sales_history sh ON sh.product_id = p.id
  WHERE p.analysis_id IN (
    SELECT id FROM analyses 
    WHERE status = 'completed' 
    ORDER BY created_at DESC 
    LIMIT 1
  )
  AND sh.date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY p.id
)
SELECT 
  cleaned_name as produto,
  total_revenue as receita,
  ROUND((total_revenue / SUM(total_revenue) OVER () * 100)::numeric, 2) as contribuicao_pct
FROM product_sales
WHERE total_revenue > 0
ORDER BY total_revenue DESC
LIMIT 5;
