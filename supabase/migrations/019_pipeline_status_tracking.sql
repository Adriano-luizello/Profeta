-- Migration: Pipeline Status Tracking
-- Adiciona campo para tracking de quando o pipeline iniciou
-- O campo 'status' já existe e será usado para tracking de estado

-- Adicionar campo pipeline_started_at se não existir
ALTER TABLE public.analyses 
  ADD COLUMN IF NOT EXISTS pipeline_started_at TIMESTAMPTZ;

-- Criar índice para queries por status
CREATE INDEX IF NOT EXISTS idx_analyses_status_created ON public.analyses(status, created_at DESC);

-- Comentários para documentação
COMMENT ON COLUMN public.analyses.status IS 'Estado atual do pipeline: uploading, validating, cleaning, forecasting, recommending, completed, failed';
COMMENT ON COLUMN public.analyses.error_message IS 'Mensagem de erro detalhada quando status=failed. Indica em qual etapa falhou.';
COMMENT ON COLUMN public.analyses.pipeline_started_at IS 'Timestamp de quando o pipeline iniciou (primeira etapa após upload)';
COMMENT ON COLUMN public.analyses.completed_at IS 'Timestamp de quando o pipeline foi concluído (success ou fail)';
