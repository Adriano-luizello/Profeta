'use client'

/**
 * Cards de estatísticas e recomendações do forecast
 */

import type {
  ForecastMetrics,
  ForecastRecommendations,
} from '@/types/forecasting'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ForecastStatsProps {
  metrics: ForecastMetrics
  recommendations: ForecastRecommendations
}

export function ForecastStats({
  metrics,
  recommendations,
}: ForecastStatsProps) {
  // Ícone e cor baseado na tendência
  const getTrendDisplay = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return { icon: '📈', text: 'Crescente', color: 'text-green-600 bg-green-50' }
      case 'decreasing':
        return { icon: '📉', text: 'Decrescente', color: 'text-red-600 bg-red-50' }
      default:
        return { icon: '➡️', text: 'Estável', color: 'text-gray-600 bg-gray-50' }
    }
  }

  const trendDisplay = getTrendDisplay(metrics.trend)

  // Formatar data de reabastecimento
  const restockDateFormatted = recommendations.restock_date
    ? format(new Date(recommendations.restock_date), "dd 'de' MMMM 'de' yyyy", {
        locale: ptBR,
      })
    : null

  return (
    <div className="space-y-6">
      {/* Métricas */}
      <div>
        <h3 className="text-lg font-semibold mb-4">📊 Métricas do Forecast</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tendência */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{trendDisplay.icon}</span>
              <span className="text-sm text-gray-600">Tendência</span>
            </div>
            <div
              className={`text-xl font-bold ${trendDisplay.color} px-3 py-1 rounded inline-block`}
            >
              {trendDisplay.text}
            </div>
          </div>

          {/* Sazonalidade */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🌡️</span>
              <span className="text-sm text-gray-600">Sazonalidade</span>
            </div>
            <div className="text-xl font-bold text-purple-600">
              {(metrics.seasonality_strength * 100).toFixed(0)}%
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${metrics.seasonality_strength * 100}%` }}
              />
            </div>
          </div>

          {/* Confiança */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🎯</span>
              <span className="text-sm text-gray-600">Confiança</span>
            </div>
            <div className="text-xl font-bold text-blue-600">
              {(recommendations.confidence * 100).toFixed(0)}%
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${recommendations.confidence * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recomendações */}
      <div>
        <h3 className="text-lg font-semibold mb-4">💡 Recomendações</h3>
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg shadow">
          {recommendations.suggested_quantity && recommendations.suggested_quantity > 0 ? (
            <div className="space-y-4">
              {/* Alerta de reabastecimento */}
              <div className="flex items-start gap-3">
                <span className="text-3xl">⚠️</span>
                <div className="flex-1">
                  <h4 className="font-bold text-lg mb-2">
                    Reabastecimento Recomendado
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">
                        Data sugerida:
                      </span>
                      <span className="text-sm font-bold text-blue-600">
                        {restockDateFormatted}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">
                        Quantidade:
                      </span>
                      <span className="text-sm font-bold text-purple-600">
                        {recommendations.suggested_quantity} unidades
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              <div className="mt-4 p-4 bg-white rounded-lg border-l-4 border-blue-500">
                <p className="text-sm text-gray-700">
                  {recommendations.reasoning}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <span className="text-3xl">✅</span>
              <div className="flex-1">
                <h4 className="font-bold text-lg mb-2">Estoque Adequado</h4>
                <div className="mt-2 p-4 bg-white rounded-lg border-l-4 border-green-500">
                  <p className="text-sm text-gray-700">
                    {recommendations.reasoning}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
