-- ============================================
-- Stockouts evitados: rastreamento de "pedido feito"
-- ============================================

CREATE TABLE IF NOT EXISTS public.alert_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  recommendation_id UUID NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL DEFAULT 'pedido_feito' CHECK (action_type IN ('pedido_feito')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, recommendation_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_actions_user_created ON public.alert_actions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_actions_recommendation ON public.alert_actions(recommendation_id);

ALTER TABLE public.alert_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own alert_actions" ON public.alert_actions;
CREATE POLICY "Users can view own alert_actions"
  ON public.alert_actions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own alert_actions" ON public.alert_actions;
CREATE POLICY "Users can insert own alert_actions"
  ON public.alert_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.alert_actions IS 'Registra quando o usuário marca um alerta como "pedido feito". Usado para métrica Stockouts evitados.';
