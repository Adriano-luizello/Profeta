-- Migration: 018_rate_limits.sql
-- Rate limiting table for chat API abuse prevention

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Contadores de janela por minuto
  minute_count INTEGER DEFAULT 0,
  minute_window TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contadores de janela diária
  day_count INTEGER DEFAULT 0,
  day_tokens_used INTEGER DEFAULT 0,
  day_window DATE DEFAULT CURRENT_DATE,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único por user (garante um registro por usuário)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_user ON public.rate_limits(user_id);

-- RLS: apenas service_role pode acessar (não expor ao client)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy que bloqueia acesso de qualquer role que não seja service_role
CREATE POLICY "Service role only" ON public.rate_limits
  USING (false)
  WITH CHECK (false);

-- Comentários para documentação
COMMENT ON TABLE public.rate_limits IS 'Rate limiting counters per user for chat API abuse prevention';
COMMENT ON COLUMN public.rate_limits.minute_count IS 'Number of requests in current minute window';
COMMENT ON COLUMN public.rate_limits.minute_window IS 'Start timestamp of current minute window';
COMMENT ON COLUMN public.rate_limits.day_count IS 'Number of requests in current day';
COMMENT ON COLUMN public.rate_limits.day_tokens_used IS 'Total tokens consumed in current day';
COMMENT ON COLUMN public.rate_limits.day_window IS 'Current day (YYYY-MM-DD) for daily counters';
