import type { SupabaseClient } from '@supabase/supabase-js'

export type PipelineStatus = 
  | 'uploading' 
  | 'validating' 
  | 'cleaning' 
  | 'forecasting' 
  | 'recommending' 
  | 'completed' 
  | 'failed'

export interface UpdateStatusOptions {
  /** Mensagem de erro (apenas para status='failed') */
  error?: string
  /** Define started_at para o timestamp atual (apenas na primeira etapa) */
  markAsStarted?: boolean
  /** Define completed_at para o timestamp atual (apenas em completed/failed) */
  markAsCompleted?: boolean
}

/**
 * Atualiza o status do pipeline de uma análise.
 * Centraliza a lógica de transição de estado e logging.
 * 
 * @example
 * // Iniciar pipeline
 * await updatePipelineStatus(supabase, analysisId, 'cleaning', { markAsStarted: true })
 * 
 * // Transição intermediária
 * await updatePipelineStatus(supabase, analysisId, 'forecasting')
 * 
 * // Conclusão com sucesso
 * await updatePipelineStatus(supabase, analysisId, 'completed', { markAsCompleted: true })
 * 
 * // Falha
 * await updatePipelineStatus(supabase, analysisId, 'failed', { 
 *   error: 'Erro ao gerar previsão: timeout', 
 *   markAsCompleted: true 
 * })
 */
export async function updatePipelineStatus(
  supabase: SupabaseClient,
  analysisId: string,
  status: PipelineStatus,
  options: UpdateStatusOptions = {}
): Promise<void> {
  const { error, markAsStarted, markAsCompleted } = options
  
  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString()
  }
  
  // Marcar início do pipeline (primeira etapa)
  if (markAsStarted) {
    updateData.pipeline_started_at = new Date().toISOString()
  }
  
  // Marcar conclusão do pipeline (sucesso ou falha)
  if (markAsCompleted) {
    updateData.completed_at = new Date().toISOString()
  }
  
  // Armazenar mensagem de erro
  if (error) {
    updateData.error_message = error
  } else if (status === 'completed') {
    // Limpar erro anterior em caso de sucesso
    updateData.error_message = null
  }
  
  const { error: dbError } = await supabase
    .from('analyses')
    .update(updateData)
    .eq('id', analysisId)
  
  if (dbError) {
    console.error(`[Pipeline] ❌ Erro ao atualizar status para ${status}:`, dbError.message)
  } else {
    const statusEmoji = {
      uploading: '📤',
      validating: '🔍',
      cleaning: '🧹',
      forecasting: '🔮',
      recommending: '💡',
      completed: '✅',
      failed: '❌'
    }[status] || '📊'
    
    const logMessage = error 
      ? `${statusEmoji} Status: ${status} (${error})`
      : `${statusEmoji} Status: ${status}`
    
    console.log(`[Pipeline] ${logMessage} → ${analysisId.slice(0, 8)}...`)
  }
}
