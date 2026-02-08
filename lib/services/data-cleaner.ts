import { openai, CLEANING_CONFIG, estimateCost, estimateTokens, rateLimiter } from '@/lib/openai/client'
import { createCleaningPrompt } from '@/lib/openai/prompts'
import type { CleanedProductData, Anomaly } from '@/types/cleaning'

interface ProductToClean {
  id: string
  original_name: string
  original_category?: string | null
  price: number
  description?: string | null
  sales_history?: number[]
}

interface CleaningResult {
  success: boolean
  data?: CleanedProductData
  error?: string
  tokens_used?: {
    input: number
    output: number
  }
  cost_usd?: number
}

/**
 * Limpa e enriquece um único produto usando GPT-4
 */
export async function cleanProduct(product: ProductToClean): Promise<CleaningResult> {
  // ===== TIMING: GPT START =====
  const gptStart = Date.now()
  
  try {
    // Aguardar rate limit se necessário
    await rateLimiter.waitIfNeeded()

    // Criar prompt
    const salesHistory = product.sales_history || []
    const prompt = createCleaningPrompt(
      product.original_name,
      product.original_category || null,
      product.price,
      product.description || null,
      salesHistory
    )

    // Estimar tokens de entrada
    const inputTokens = estimateTokens(prompt)

    // Chamar GPT-4
    const response = await openai.chat.completions.create({
      model: CLEANING_CONFIG.model,
      temperature: CLEANING_CONFIG.temperature,
      max_tokens: CLEANING_CONFIG.max_tokens,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content

    if (!content) {
      throw new Error('Resposta vazia da API')
    }

    // Parse JSON
    const cleaned = JSON.parse(content) as CleanedProductData

    // Validar resposta
    const validation = validateCleanedData(cleaned)
    if (!validation.valid) {
      throw new Error(`Validação falhou: ${validation.errors.join(', ')}`)
    }

    // Calcular custo
    const outputTokens = estimateTokens(content)
    const cost = estimateCost(inputTokens, outputTokens)

    // ===== TIMING: GPT END =====
    const gptMs = Date.now() - gptStart

    return {
      success: true,
      data: cleaned,
      tokens_used: {
        input: inputTokens,
        output: outputTokens
      },
      cost_usd: cost
    }

  } catch (error) {
    const gptMs = Date.now() - gptStart
    console.error(`[Clean] Erro ao limpar produto ${product.id} (${gptMs}ms):`, error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/** Fallback quando GPT falha após todos os retries */
function fallbackCleaningResult(product: ProductToClean): CleaningResult {
  const fallbackData: CleanedProductData = {
    cleaned_name: product.original_name?.trim() || 'Produto Sem Nome',
    refined_category: 'Produtos Diversos',
    attributes: {},
    seasonality: 'year-round',
    expected_return_rate: 0.1,
    data_quality_score: 20,
    anomalies_detected: [
      {
        type: 'missing_data',
        field: 'name',
        severity: 'high',
        description: 'Falha na limpeza GPT após retries; mantido nome original.'
      }
    ],
    ai_confidence: 0.1,
    reasoning: 'Falha ao processar com GPT; dados originais mantidos.'
  }
  return { success: true, data: fallbackData }
}

/**
 * Limpa múltiplos produtos em lotes paralelos (com retry por produto)
 */
export async function cleanProducts(
  products: ProductToClean[],
  maxRetries = 3
): Promise<CleaningResult[]> {
  const BATCH_SIZE = CLEANING_CONFIG.batch_size ?? 10
  const results: CleaningResult[] = []

  if (products.length === 0) return results

  console.log(`🧹 Limpando ${products.length} produtos em lotes de ${BATCH_SIZE}...`)

  const batches: ProductToClean[][] = []
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    batches.push(products.slice(i, i + BATCH_SIZE))
  }

  let totalGptCalls = 0
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    const batchNum = i + 1
    const totalBatches = batches.length

    // ===== TIMING: BATCH START =====
    const batchStart = Date.now()
    console.log(`📦 Processando lote ${batchNum}/${totalBatches} (${batch.length} produtos)...`)

    const batchPromises = batch.map(async (product): Promise<CleaningResult> => {
      let attempts = 0
      let result: CleaningResult | null = null

      while (attempts < maxRetries) {
        result = await cleanProduct(product)
        totalGptCalls++
        if (result.success) break
        attempts++
        if (attempts < maxRetries) {
          const waitTime = Math.pow(2, attempts) * 1000
          console.log(`   Retry ${attempts}/${maxRetries} produto "${product.original_name?.slice(0, 30)}..." após ${waitTime}ms`)
          await new Promise((resolve) => setTimeout(resolve, waitTime))
        }
      }

      if (!result?.success) {
        console.error(`❌ Falha ao limpar produto "${product.original_name}" após ${maxRetries} tentativas; usando fallback.`)
        return fallbackCleaningResult(product)
      }
      return result
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)

    // ===== TIMING: BATCH END =====
    const batchMs = Date.now() - batchStart
    const avgPerProduct = Math.round(batchMs / batch.length)
    console.log(`[Clean] Batch ${batchNum}: ${batch.length} produtos | ${batchMs}ms total | ${avgPerProduct}ms/produto`)

    if (i < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  console.log(`[Clean] Chamadas GPT-4: ${totalGptCalls} total`)

  console.log(`✅ Limpeza concluída: ${results.length} produtos processados`)
  return results
}

/**
 * Valida dados limpos
 */
function validateCleanedData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Campos obrigatórios
  if (!data.cleaned_name || typeof data.cleaned_name !== 'string') {
    errors.push('cleaned_name inválido')
  }

  if (!data.refined_category || typeof data.refined_category !== 'string') {
    errors.push('refined_category inválido')
  }

  if (!data.attributes || typeof data.attributes !== 'object') {
    errors.push('attributes inválido')
  }

  if (!data.seasonality || typeof data.seasonality !== 'string') {
    errors.push('seasonality inválido')
  }

  // Valores numéricos
  if (typeof data.expected_return_rate !== 'number' || 
      data.expected_return_rate < 0 || 
      data.expected_return_rate > 1) {
    errors.push('expected_return_rate deve estar entre 0 e 1')
  }

  if (typeof data.data_quality_score !== 'number' || 
      data.data_quality_score < 0 || 
      data.data_quality_score > 100) {
    errors.push('data_quality_score deve estar entre 0 e 100')
  }

  if (typeof data.ai_confidence !== 'number' || 
      data.ai_confidence < 0 || 
      data.ai_confidence > 1) {
    errors.push('ai_confidence deve estar entre 0 e 1')
  }

  // Arrays
  if (!Array.isArray(data.anomalies_detected)) {
    errors.push('anomalies_detected deve ser um array')
  }

  if (!data.reasoning || typeof data.reasoning !== 'string') {
    errors.push('reasoning inválido')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Calcula estatísticas de limpeza
 */
export function calculateCleaningStats(results: CleaningResult[]) {
  const stats = {
    total: results.length,
    valid: 0,
    invalid: 0,
    high_quality: 0,
    medium_quality: 0,
    low_quality: 0,
    anomalies_found: 0,
    critical_anomalies: 0,
    average_confidence: 0,
    average_data_quality: 0,
    total_cost_usd: 0,
    by_category: {} as Record<string, number>
  }

  const confidences: number[] = []
  const qualityScores: number[] = []

  for (const result of results) {
    if (result.success && result.data) {
      stats.valid++

      const quality = result.data.data_quality_score
      if (quality >= 80) {
        stats.high_quality++
      } else if (quality >= 50) {
        stats.medium_quality++
      } else {
        stats.low_quality++
      }

      stats.anomalies_found += result.data.anomalies_detected.length
      stats.critical_anomalies += result.data.anomalies_detected.filter(
        a => a.severity === 'critical'
      ).length

      confidences.push(result.data.ai_confidence)
      qualityScores.push(quality)

      // Contar por categoria
      const category = result.data.refined_category
      stats.by_category[category] = (stats.by_category[category] || 0) + 1

      // Somar custo
      if (result.cost_usd) {
        stats.total_cost_usd += result.cost_usd
      }
    } else {
      stats.invalid++
    }
  }

  stats.average_confidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0

  stats.average_data_quality = qualityScores.length > 0
    ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
    : 0

  return stats
}
