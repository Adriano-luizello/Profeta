/**
 * Cliente para chamar a Python Forecaster API
 */

import { Agent, fetch as undiciFetch } from 'undici'
import type {
  ForecastRequest,
  ForecastResponse,
  ForecastError
} from '@/types/forecasting'

// URL da Python API (configurável via env)
const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000'

// Timeout para forecast (múltiplos produtos: Prophet + XGBoost pode levar 2–5 min ou mais)
const FORECAST_TIMEOUT_MS = 600_000 // 10 minutos

// Agent com timeout para headers/body (evita UND_ERR_HEADERS_TIMEOUT no Node)
const LONG_FETCH_AGENT = new Agent({
  headersTimeout: FORECAST_TIMEOUT_MS,
  bodyTimeout: FORECAST_TIMEOUT_MS,
})

export class ForecastClient {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || PYTHON_API_URL
  }

  /**
   * Health check da API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      return data.status === 'ok'
    } catch (error) {
      console.error('❌ Health check failed:', error)
      return false
    }
  }

  /**
   * Gera forecast para uma análise
   */
  async generateForecast(request: ForecastRequest): Promise<ForecastResponse> {
    try {
      console.log('🔮 Solicitando forecast:', request)

      const response = await undiciFetch(`${this.baseUrl}/forecast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysis_id: request.analysis_id,
          forecast_days: request.forecast_days ?? [30, 60, 90],
          by_product: request.by_product ?? true,
          by_category: request.by_category ?? true,
        }),
        // Timeout de 10 min (AbortSignal)
        signal: AbortSignal.timeout(FORECAST_TIMEOUT_MS),
        // Evita UND_ERR_HEADERS_TIMEOUT: undici espera headers/body até o timeout
        dispatcher: LONG_FETCH_AGENT,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          detail: 'Erro desconhecido',
        }))
        throw new Error(
          (error as { detail?: string }).detail || `HTTP ${response.status}`
        )
      }

      const result = (await response.json()) as ForecastResponse
      console.log('✅ Forecast recebido:', result)
      return result
    } catch (error: unknown) {
      // Tratar timeout especificamente (AbortSignal ou undici headers/body timeout)
      const causeCode = (error as { cause?: { code?: string } })?.cause?.code
      if (
        (error instanceof Error &&
          (error.name === 'TimeoutError' || error.name === 'AbortError')) ||
        causeCode === 'UND_ERR_HEADERS_TIMEOUT' ||
        causeCode === 'UND_ERR_BODY_TIMEOUT'
      ) {
        console.error('❌ Timeout no forecast')
        throw new Error(
          'Timeout: O forecast está demorando mais que o esperado. ' +
            'Para muitos produtos, o processamento pode levar até 10 minutos.'
        )
      }

      console.error('❌ Erro ao gerar forecast:', error)
      throw error
    }
  }

  /**
   * Busca forecast existente
   */
  async getForecast(analysisId: string): Promise<ForecastResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/forecast/${analysisId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.status === 404) {
        return null
      }

      if (!response.ok) {
        throw new Error('Erro ao buscar forecast')
      }

      const data: ForecastResponse = await response.json()
      return data
    } catch (error) {
      console.error('❌ Erro ao buscar forecast:', error)
      return null
    }
  }
}

// Instância singleton
export const forecastClient = new ForecastClient()

// Helper functions para uso direto

export async function generateForecast(
  request: ForecastRequest
): Promise<ForecastResponse> {
  return forecastClient.generateForecast(request)
}

export async function getForecast(
  analysisId: string
): Promise<ForecastResponse | null> {
  return forecastClient.getForecast(analysisId)
}

export async function checkForecastAPI(): Promise<boolean> {
  return forecastClient.healthCheck()
}
