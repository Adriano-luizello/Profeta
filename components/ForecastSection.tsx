'use client'

/**
 * Seção de Forecast com estado compartilhado.
 * Pode ser controlado pelo pai (forecast, onGenerate, generating, error) ou usar estado interno.
 */

import { useState, useCallback } from 'react'
import { GenerateForecastButton } from './GenerateForecastButton'
import { ForecastDisplay } from './ForecastDisplay'
import type { ForecastResponse } from '@/types/forecasting'

interface ForecastSectionProps {
  analysisId: string
  showPrevisaoCard?: boolean
  /** Modo controlado: pai passa forecast e handler */
  forecast?: ForecastResponse | null
  onGenerate?: () => Promise<void>
  generating?: boolean
  error?: string | null
}

export function ForecastSection({
  analysisId,
  showPrevisaoCard = true,
  forecast: controlledForecast,
  onGenerate: controlledOnGenerate,
  generating: controlledGenerating,
  error: controlledError,
}: ForecastSectionProps) {
  const [internalForecast, setInternalForecast] = useState<ForecastResponse | null>(null)
  const [internalGenerating, setInternalGenerating] = useState(false)
  const [internalError, setInternalError] = useState<string | null>(null)

  const isControlled =
    controlledOnGenerate != null &&
    controlledGenerating != null &&
    controlledError !== undefined

  const forecast = isControlled ? controlledForecast ?? null : internalForecast
  const generating = isControlled ? controlledGenerating : internalGenerating
  const error = isControlled ? controlledError : internalError

  const handleGenerateInternal = useCallback(async () => {
    try {
      setInternalGenerating(true)
      setInternalError(null)
      const response = await fetch(`/api/analyses/${analysisId}/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forecast_days: [30, 60, 90],
          by_product: true,
          by_category: true,
        }),
        signal: AbortSignal.timeout(600_000), // 10 min — backend Prophet + XGBoost pode levar 2–5 min
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao gerar forecast')
      }
      const data: ForecastResponse = await response.json()
      setInternalForecast(data)
      setInternalError(null)
    } catch (err: unknown) {
      setInternalError(err instanceof Error ? err.message : 'Erro ao gerar forecast')
    } finally {
      setInternalGenerating(false)
    }
  }, [analysisId])

  const handleGenerate = isControlled ? controlledOnGenerate! : handleGenerateInternal

  return (
    <>
      {showPrevisaoCard && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                📈 Previsão de Demanda
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Gere previsões de vendas para os próximos 30, 60 e 90 dias usando IA.
                O processamento pode levar alguns minutos quando há vários produtos.
              </p>
            </div>
            <GenerateForecastButton
              onGenerate={() => handleGenerate?.()}
              loading={generating}
              error={error}
            />
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🔮</div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Previsão Inteligente com Prophet
                </h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    Forecast por produto e categoria
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    Horizontes de 30, 60 e 90 dias
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    Detecção automática de tendências e sazonalidade
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    Recomendações de reabastecimento
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <ForecastDisplay
        analysisId={analysisId}
        forecast={forecast}
        onGenerateForecast={handleGenerate}
        generating={generating}
        error={error}
      />
    </>
  )
}
