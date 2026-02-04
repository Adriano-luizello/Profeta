-- Cache do resultado completo do forecast por análise (para dashboard e GET sem depender do Python).
CREATE TABLE IF NOT EXISTS public.forecast_results (
  analysis_id UUID PRIMARY KEY REFERENCES public.analyses(id) ON DELETE CASCADE,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecast_results_analysis_id ON public.forecast_results(analysis_id);

ALTER TABLE public.forecast_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view forecast_results for their analyses"
  ON public.forecast_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = forecast_results.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert forecast_results for their analyses"
  ON public.forecast_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = forecast_results.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update forecast_results for their analyses"
  ON public.forecast_results FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = forecast_results.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete forecast_results for their analyses"
  ON public.forecast_results FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = forecast_results.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );
