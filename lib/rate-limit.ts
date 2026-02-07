import { createServiceRoleClient } from '@/lib/supabase/server'

// Limites configuráveis - ajustar conforme necessário
const LIMITS = {
  REQUESTS_PER_MINUTE: 10,
  REQUESTS_PER_DAY: 200,
  TOKENS_PER_DAY: 100_000, // ~$0.30-0.75 dependendo do modelo Claude
} as const

interface RateLimitResult {
  allowed: boolean
  reason?: string
  retryAfterSeconds?: number
}

/**
 * Verifica se o usuário pode fazer uma nova requisição ao chat API.
 * Implementa rate limiting por minuto e por dia, além de limite de tokens diários.
 * 
 * IMPORTANTE: Usa service role client para bypassar RLS (rate_limits table é service-only).
 * 
 * @param userId - ID do usuário (UUID do auth.users)
 * @returns { allowed, reason?, retryAfterSeconds? }
 */
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const supabase = createServiceRoleClient()
  const now = new Date()
  const today = now.toISOString().split('T')[0] // YYYY-MM-DD

  try {
    // Upsert: cria registro se não existe, ou retorna existente
    const { data, error } = await supabase
      .from('rate_limits')
      .upsert(
        {
          user_id: userId,
          updated_at: now.toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('[Rate Limit] Failed to check rate limit:', error)
      // Fail open: não bloquear usuário se o sistema de rate limit falhar
      return { allowed: true }
    }

    const record = data

    // ===== JANELA DE MINUTO =====
    const minuteWindow = new Date(record.minute_window)
    const secondsSinceMinuteReset = (now.getTime() - minuteWindow.getTime()) / 1000

    if (secondsSinceMinuteReset >= 60) {
      // Nova janela de minuto - resetar contador
      await supabase
        .from('rate_limits')
        .update({
          minute_count: 1,
          minute_window: now.toISOString(),
        })
        .eq('user_id', userId)
      
      // Continuar verificando limites diários...
    } else if (record.minute_count >= LIMITS.REQUESTS_PER_MINUTE) {
      // Limite de minuto atingido
      return {
        allowed: false,
        reason: `Limite de ${LIMITS.REQUESTS_PER_MINUTE} mensagens por minuto atingido. Aguarde um momento.`,
        retryAfterSeconds: Math.ceil(60 - secondsSinceMinuteReset),
      }
    } else {
      // Incrementar contador de minuto
      await supabase
        .from('rate_limits')
        .update({
          minute_count: record.minute_count + 1,
        })
        .eq('user_id', userId)
    }

    // ===== JANELA DIÁRIA =====
    if (record.day_window !== today) {
      // Novo dia - resetar contadores diários
      await supabase
        .from('rate_limits')
        .update({
          day_count: 1,
          day_tokens_used: 0,
          day_window: today,
        })
        .eq('user_id', userId)
      return { allowed: true }
    }

    // Verificar limite diário de requests
    if (record.day_count >= LIMITS.REQUESTS_PER_DAY) {
      return {
        allowed: false,
        reason: `Limite diário de ${LIMITS.REQUESTS_PER_DAY} mensagens atingido. O limite reseta à meia-noite.`,
      }
    }

    // Verificar limite diário de tokens
    if (record.day_tokens_used >= LIMITS.TOKENS_PER_DAY) {
      return {
        allowed: false,
        reason: 'Limite diário de uso atingido. O limite reseta à meia-noite.',
      }
    }

    // Incrementar contador diário
    await supabase
      .from('rate_limits')
      .update({
        day_count: record.day_count + 1,
        updated_at: now.toISOString(),
      })
      .eq('user_id', userId)

    return { allowed: true }
  } catch (e) {
    console.error('[Rate Limit] Unexpected error:', e)
    // Fail open: não bloquear usuário em caso de erro inesperado
    return { allowed: true }
  }
}

/**
 * Registra tokens usados APÓS a resposta do Claude.
 * Atualiza o contador day_tokens_used para controle de custo.
 * 
 * IMPORTANTE: Usar service role client para bypassar RLS.
 * 
 * @param userId - ID do usuário
 * @param tokensUsed - Total de tokens (input + output) da resposta do Claude
 */
export async function recordTokenUsage(
  userId: string,
  tokensUsed: number
): Promise<void> {
  const supabase = createServiceRoleClient()

  try {
    const { data } = await supabase
      .from('rate_limits')
      .select('day_tokens_used')
      .eq('user_id', userId)
      .single()

    if (data) {
      await supabase
        .from('rate_limits')
        .update({
          day_tokens_used: (data.day_tokens_used || 0) + tokensUsed,
        })
        .eq('user_id', userId)
    }
  } catch (e) {
    // Não falhar silenciosamente - apenas log
    console.error('[Rate Limit] Failed to record token usage:', e)
  }
}
