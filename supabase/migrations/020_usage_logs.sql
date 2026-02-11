-- Migration 020: Usage Logs para tracking de custos de IA
--
-- Registra consumo de tokens e custo estimado de Claude (chat) e GPT-4 (limpeza)
-- antes de cobrar pelo produto.

CREATE TABLE public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Contexto
  service TEXT NOT NULL CHECK (service IN ('claude_chat', 'gpt4_cleaning', 'gpt4_forecast')),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,  -- null para chat
  
  -- Consumo
  input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  
  -- Custo estimado (em USD centavos para evitar decimais pequenos)
  estimated_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (estimated_cost_cents >= 0),
  
  -- Metadata
  model TEXT,  -- 'claude-3-5-sonnet-20241022', 'gpt-4o-mini', etc.
  metadata JSONB DEFAULT '{}',  -- Dados extras: tool_name, product_count, batch_index, etc.
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentários para documentação
COMMENT ON TABLE public.usage_logs IS 'Registra consumo de tokens e custos de IA (Claude chat + GPT-4 cleaning) para tracking de custos por usuário';
COMMENT ON COLUMN public.usage_logs.service IS 'Tipo de serviço: claude_chat (chat), gpt4_cleaning (limpeza de dados), gpt4_forecast (futuro)';
COMMENT ON COLUMN public.usage_logs.estimated_cost_cents IS 'Custo estimado em centavos de USD (ex: 150 = $1.50)';
COMMENT ON COLUMN public.usage_logs.metadata IS 'JSON com dados extras: tool_name, product_count, batch_index, has_chart, etc.';

-- Índices para queries por usuário e período
CREATE INDEX idx_usage_logs_user_date ON public.usage_logs(user_id, created_at DESC);
CREATE INDEX idx_usage_logs_service ON public.usage_logs(service, created_at DESC);
CREATE INDEX idx_usage_logs_analysis ON public.usage_logs(analysis_id) WHERE analysis_id IS NOT NULL;

-- Row Level Security
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver apenas seus próprios logs (futuro: dashboard de consumo)
CREATE POLICY "Users can view own usage logs"
  ON public.usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Insert via service role apenas (backend)
-- Não precisa de policy de INSERT pois RLS não se aplica a service role
-- Mas vamos criar para documentar o comportamento esperado
CREATE POLICY "Service can insert usage logs"
  ON public.usage_logs
  FOR INSERT
  WITH CHECK (true);  -- Service role bypassa RLS, mas documentamos a intenção

-- Ninguém pode UPDATE ou DELETE logs (imutável para auditoria)
-- RLS já bloqueia por padrão, mas vamos explicitar
