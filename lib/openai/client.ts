import OpenAI from 'openai'

// Validar API Key
const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  throw new Error('OPENAI_API_KEY não configurada no .env.local')
}

// Cliente OpenAI
export const openai = new OpenAI({
  apiKey: apiKey
})

// Configuração de limpeza
export const CLEANING_CONFIG = {
  model: 'gpt-4o-mini',
  temperature: 0.2, // Mais determinístico para identificação consistente de variantes/SKUs
  max_tokens: 1500,
  batch_size: 10 // Processar 10 produtos por vez
}

// Rate Limiter simples (50ms entre chamadas; lotes paralelos já limitam throughput)
class RateLimiter {
  private lastCall = 0
  private minInterval = 50 // 50ms entre chamadas

  async waitIfNeeded() {
    const now = Date.now()
    const timeSinceLastCall = now - this.lastCall
    
    if (timeSinceLastCall < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastCall
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastCall = Date.now()
  }
}

export const rateLimiter = new RateLimiter()

/**
 * Estima custo da chamada
 * GPT-4o-mini: $0.150/1M input tokens, $0.600/1M output tokens
 */
export function estimateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 0.15
  const outputCost = (outputTokens / 1_000_000) * 0.6
  return inputCost + outputCost
}

/**
 * Estima tokens de uma string (aproximação)
 */
export function estimateTokens(text: string): number {
  // Aproximação: ~4 caracteres por token
  return Math.ceil(text.length / 4)
}
