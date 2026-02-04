-- ============================================
-- RLS para tabelas XGBoost (feature_store, forecasts_xgboost, model_metadata)
-- Isolamento por usuário: só dados das próprias análises (analysis_id → analyses.user_id)
-- ============================================

-- ---------------------------------------------------------------------------
-- 1. feature_store
-- ---------------------------------------------------------------------------
ALTER TABLE public.feature_store ENABLE ROW LEVEL SECURITY;

-- SELECT: usuário só vê features de análises que pertencem a ele (analysis_id → analyses.user_id).
CREATE POLICY "Users can view feature_store for their analyses"
  ON public.feature_store FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = feature_store.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- INSERT: usuário só pode inserir linhas cuja analysis_id seja de uma análise dele.
CREATE POLICY "Users can insert feature_store for their analyses"
  ON public.feature_store FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = feature_store.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- UPDATE: usuário só pode atualizar linhas de suas análises (USING) e o resultado deve continuar sendo de uma análise dele (WITH CHECK).
CREATE POLICY "Users can update feature_store for their analyses"
  ON public.feature_store FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = feature_store.analysis_id
      AND analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = feature_store.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- DELETE: usuário só pode apagar linhas de feature_store cuja análise é dele.
CREATE POLICY "Users can delete feature_store for their analyses"
  ON public.feature_store FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = feature_store.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2. forecasts_xgboost
-- ---------------------------------------------------------------------------
ALTER TABLE public.forecasts_xgboost ENABLE ROW LEVEL SECURITY;

-- SELECT: usuário só vê previsões XGBoost de análises que pertencem a ele.
CREATE POLICY "Users can view forecasts_xgboost for their analyses"
  ON public.forecasts_xgboost FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = forecasts_xgboost.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- INSERT: usuário só pode inserir previsões para análises dele.
CREATE POLICY "Users can insert forecasts_xgboost for their analyses"
  ON public.forecasts_xgboost FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = forecasts_xgboost.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- UPDATE: usuário só pode atualizar previsões de suas análises.
CREATE POLICY "Users can update forecasts_xgboost for their analyses"
  ON public.forecasts_xgboost FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = forecasts_xgboost.analysis_id
      AND analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = forecasts_xgboost.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- DELETE: usuário só pode apagar previsões XGBoost de análises dele.
CREATE POLICY "Users can delete forecasts_xgboost for their analyses"
  ON public.forecasts_xgboost FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = forecasts_xgboost.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. model_metadata
-- ---------------------------------------------------------------------------
ALTER TABLE public.model_metadata ENABLE ROW LEVEL SECURITY;

-- SELECT: usuário só vê metadados de modelos de análises que pertencem a ele.
CREATE POLICY "Users can view model_metadata for their analyses"
  ON public.model_metadata FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = model_metadata.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- INSERT: usuário só pode inserir metadados para análises dele.
CREATE POLICY "Users can insert model_metadata for their analyses"
  ON public.model_metadata FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = model_metadata.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- UPDATE: usuário só pode atualizar metadados de suas análises.
CREATE POLICY "Users can update model_metadata for their analyses"
  ON public.model_metadata FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = model_metadata.analysis_id
      AND analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = model_metadata.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- DELETE: usuário só pode apagar metadados de análises dele.
CREATE POLICY "Users can delete model_metadata for their analyses"
  ON public.model_metadata FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = model_metadata.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );
