-- Allow users to update products from their analyses (e.g. supplier_id)
DROP POLICY IF EXISTS "Users can update products from their analyses" ON public.products;
CREATE POLICY "Users can update products from their analyses"
  ON public.products FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = products.analysis_id
      AND analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = products.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );
