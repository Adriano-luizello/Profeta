'use client'

/**
 * Gráfico de forecast com Chart.js
 * Mostra dados históricos + previsão com intervalo de confiança
 */

import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions
} from 'chart.js'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  HistoricalDataPoint,
  ForecastDataPoint,
  ForecastHorizon
} from '@/types/forecasting'

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface ForecastChartProps {
  historical: HistoricalDataPoint[]
  forecast30d?: ForecastDataPoint[]
  forecast60d?: ForecastDataPoint[]
  forecast90d?: ForecastDataPoint[]
  selectedHorizon?: ForecastHorizon
  title?: string
  productName?: string
}

export function ForecastChart({
  historical,
  forecast30d = [],
  forecast60d = [],
  forecast90d = [],
  selectedHorizon = '30d',
  title,
  productName
}: ForecastChartProps) {
  // Mostrar apenas últimos 6 meses de histórico + projeção (evita timeline longa que comprime a previsão)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const recentHistorical = historical.filter((d) => new Date(d.date) >= sixMonthsAgo)

  // Selecionar dados do forecast baseado no horizonte
  const forecastData =
    selectedHorizon === '30d'
      ? forecast30d
      : selectedHorizon === '60d'
      ? forecast60d
      : forecast90d

  // Preparar labels (datas) — usar histórico recente para o gráfico
  const historicalLabels = recentHistorical.map((d) =>
    format(new Date(d.date), 'dd/MM', { locale: ptBR })
  )
  const forecastLabels = forecastData.map((d) =>
    format(new Date(d.date), 'dd/MM', { locale: ptBR })
  )
  const allLabels = [...historicalLabels, ...forecastLabels]

  // Dados históricos (recentes)
  const historicalQuantities = recentHistorical.map((d) => d.quantity)
  const lastHistorical = recentHistorical[recentHistorical.length - 1]
  const lastHistoricalQuantity = lastHistorical ? lastHistorical.quantity : 0

  // Previsão: conectar ao último ponto histórico (sem gap visual)
  const forecastQuantities = forecastData.map((d) => d.predicted_quantity)
  const lowerBounds = forecastData.map((d) => d.lower_bound)
  const upperBounds = forecastData.map((d) => d.upper_bound)

  // Série de previsão com ponto de conexão (último histórico = primeiro ponto da previsão)
  const forecastSeriesData = [
    ...Array(recentHistorical.length - 1).fill(null),
    lastHistoricalQuantity,
    ...forecastQuantities
  ]
  const lowerSeriesData = [
    ...Array(recentHistorical.length - 1).fill(null),
    lastHistoricalQuantity,
    ...lowerBounds
  ]
  const upperSeriesData = [
    ...Array(recentHistorical.length - 1).fill(null),
    lastHistoricalQuantity,
    ...upperBounds
  ]

  // Dados do gráfico
  const chartData: ChartData<'line'> = {
    labels: allLabels,
    datasets: [
      // Linha histórica (azul)
      {
        label: 'Histórico',
        data: [
          ...historicalQuantities,
          ...Array(forecastData.length).fill(null)
        ],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
        tension: 0.3
      },
      // Linha de previsão (verde) — conectada ao histórico
      {
        label: 'Previsão',
        data: forecastSeriesData,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 2,
        pointHoverRadius: 5,
        tension: 0.3
      },
      // Intervalo superior (área sombreada) — mais visível
      {
        label: 'Intervalo de Confiança (80%)',
        data: upperSeriesData,
        borderColor: 'rgba(34, 197, 94, 0.35)',
        backgroundColor: 'rgba(34, 197, 94, 0.18)',
        borderWidth: 1,
        pointRadius: 0,
        fill: '+1',
        tension: 0.3
      },
      // Intervalo inferior (área sombreada)
      {
        label: '',
        data: lowerSeriesData,
        borderColor: 'rgba(34, 197, 94, 0.35)',
        backgroundColor: 'rgba(34, 197, 94, 0.18)',
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        tension: 0.3
      }
    ]
  }

  // Opções do gráfico
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          filter: (item) => item.text !== '' // Remover label vazio do lower bound
        }
      },
      title: {
        display: !!title,
        text: title || `Previsão: ${productName || ''}`,
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function (context: { datasetIndex: number; dataIndex: number; parsed: { y: number | null }; dataset: { label?: string } }) {
            const label = context.dataset.label || ''
            if (context.parsed.y === null) return label ? [label] : []
            const idx = context.dataIndex
            // Previsão (dataset 1): mostrar data, valor e intervalo
            if (context.datasetIndex === 1) {
              if (idx === recentHistorical.length - 1) {
                return [label, `Conexão: ${context.parsed.y.toFixed(1)} un`]
              }
              if (idx >= recentHistorical.length) {
                const pt = forecastData[idx - recentHistorical.length]
                const dateStr = format(new Date(pt.date), "dd/MM/yyyy", { locale: ptBR })
                return [
                  `${dateStr}`,
                  `Previsão: ${pt.predicted_quantity.toFixed(1)} un`,
                  `Intervalo: ${pt.lower_bound.toFixed(0)} - ${pt.upper_bound.toFixed(0)} un`
                ]
              }
            }
            return [label ? `${label}: ${context.parsed.y.toFixed(1)} un` : `${context.parsed.y.toFixed(1)} un`]
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Quantidade'
        },
        grace: '8%',
        ticks: {
          callback: function (value) {
            return typeof value === 'number' ? value + ' un' : ''
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Data'
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          maxTicksLimit: 16,
          autoSkip: true,
          callback: function (_value: unknown, index: number) {
            const step = Math.max(1, Math.floor(allLabels.length / 14))
            return index % step === 0 ? allLabels[index] : ''
          }
        }
      }
    }
  }

  return (
    <div className="w-full h-[400px] p-4 bg-white rounded-lg shadow">
      <Line data={chartData} options={options} />
    </div>
  )
}
