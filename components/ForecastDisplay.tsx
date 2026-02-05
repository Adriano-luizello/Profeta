'use client'

/**
 * Exibe o forecast gerado.
 * Modo controlado: forecast, onGenerateForecast, generating e error vêm do pai (ForecastSection).
 */

import { useState, useEffect } from 'react'
import { ForecastChart } from './ForecastChart'
import { ForecastStats } from './ForecastStats'
import { AccuracyMetrics } from '@/components/dashboard/accuracy-metrics'
import type { ForecastResponse } from '@/types/forecasting'

interface ForecastDisplayProps {
  analysisId: string
  forecast: ForecastResponse | null
  onGenerateForecast: () => void | Promise<void>
  generating: boolean
  error: string | null
}

export function ForecastDisplay({
  analysisId: _analysisId,
  forecast,
  onGenerateForecast,
  generating,
  error,
}: ForecastDisplayProps) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [selectedHorizon, setSelectedHorizon] = useState<'30d' | '60d' | '90d'>('30d')

  useEffect(() => {
    if (forecast?.product_forecasts?.length) {
      setSelectedProduct(forecast.product_forecasts[0].product_id)
    }
  }, [forecast])

  if (!forecast || !forecast.product_forecasts || forecast.product_forecasts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-8">
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-4">
            <p className="text-red-600 dark:text-red-400">❌ Erro: {error}</p>
          </div>
        )}
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Nenhum forecast gerado ainda. Clique no botão acima para gerar!
          </p>
          <button
            onClick={() => onGenerateForecast()}
            disabled={generating}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <span className="flex items-center gap-2" title="Processamento em andamento">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Processando… (pode levar alguns minutos)
              </span>
            ) : (
              '📈 Gerar Forecast Agora'
            )}
          </button>
        </div>
      </div>
    )
  }

  const currentProduct =
    forecast.product_forecasts.find((p) => p.product_id === selectedProduct) ||
    forecast.product_forecasts[0]

  return (
    <div className="space-y-6 mt-8">
      {forecast.product_forecasts.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Selecionar Produto:
          </label>
          <select
            value={selectedProduct || ''}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {forecast.product_forecasts.map((pf) => (
              <option key={pf.product_id} value={pf.product_id}>
                {pf.product_name} ({pf.category})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Horizonte de Previsão:
        </label>
        <div className="flex gap-2">
          {(['30d', '60d', '90d'] as const).map((horizon) => (
            <button
              key={horizon}
              onClick={() => setSelectedHorizon(horizon)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedHorizon === horizon
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {horizon === '30d' ? '30 dias' : horizon === '60d' ? '60 dias' : '90 dias'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📊 Previsão: {currentProduct.product_name}
        </h3>
        <ForecastChart
          historical={currentProduct.historical_data}
          forecast30d={currentProduct.forecast_30d}
          forecast60d={currentProduct.forecast_60d}
          forecast90d={currentProduct.forecast_90d}
          selectedHorizon={selectedHorizon}
          productName={currentProduct.product_name}
        />
      </div>

      <ForecastStats
        metrics={currentProduct.metrics}
        recommendations={currentProduct.recommendations}
      />

      <AccuracyMetrics
        metrics={{
          ...currentProduct.metrics,
          mean:
            currentProduct.historical_data?.length > 0
              ? currentProduct.historical_data.reduce((s, d) => s + d.quantity, 0) /
                currentProduct.historical_data.length
              : undefined,
        }}
        productName={currentProduct.product_name}
      />

      {forecast.product_forecasts.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            📋 Resumo de Todos os Produtos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forecast.product_forecasts.map((pf) => (
              <div
                key={pf.product_id}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {pf.product_name}
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tendência:</span>
                    <span className="font-medium">
                      {pf.metrics.trend === 'increasing'
                        ? '📈'
                        : pf.metrics.trend === 'decreasing'
                          ? '📉'
                          : '➡️'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Confiança:</span>
                    <span className="font-medium">
                      {Math.round(pf.recommendations.confidence * 100)}%
                    </span>
                  </div>
                  {pf.recommendations.suggested_quantity != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Reabastecer:</span>
                      <span className="font-medium text-blue-600">
                        {pf.recommendations.suggested_quantity} un
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
