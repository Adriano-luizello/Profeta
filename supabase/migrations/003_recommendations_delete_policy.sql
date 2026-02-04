-- Permitir que usuários removam recomendações dos próprios produtos (ex.: ao re-rodar forecast)
CREATE POLICY "Users can delete recommendations from their products"
  ON public.recommendations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      JOIN public.analyses ON analyses.id = products.analysis_id
      WHERE products.id = recommendations.product_id
      AND analyses.user_id = auth.uid()
    )
  );
