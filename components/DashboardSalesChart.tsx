'use client'

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

export interface SalesPoint {
  date: string
  quantity: number
}

export interface ForecastPoint {
  date: string
  predicted_quantity: number
}

interface DashboardSalesChartProps {
  sales: SalesPoint[]
  forecasts?: ForecastPoint[]
  title?: string
}

export function DashboardSalesChart({
  sales,
  forecasts = [],
  title = 'Vendas e previsão'
}: DashboardSalesChartProps) {
  const salesSorted = [...sales].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  const forecastSorted = [...forecasts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const labels = salesSorted.map((d) =>
    format(new Date(d.date), 'dd/MM', { locale: ptBR })
  )
  const forecastLabels = forecastSorted.map((d) =>
    format(new Date(d.date), 'dd/MM', { locale: ptBR })
  )
  const allLabels =
    forecastSorted.length > 0
      ? [...labels, ...forecastLabels]
      : labels

  const salesData = salesSorted.map((d) => d.quantity)
  const forecastQuantities = forecastSorted.map((d) => d.predicted_quantity)
  const salesWithNulls =
    forecastSorted.length > 0
      ? [...salesData, ...Array(forecastSorted.length).fill(null)]
      : salesData
  const forecastWithNulls =
    forecastSorted.length > 0
      ? [...Array(salesSorted.length).fill(null), ...forecastQuantities]
      : []

  const chartData: ChartData<'line'> = {
    labels: allLabels,
    datasets: [
      {
        label: 'Vendas reais',
        data: salesWithNulls,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3
      }
    ]
  }

  if (forecastSorted.length > 0) {
    chartData.datasets.push({
      label: 'Previsão',
      data: forecastWithNulls,
      borderColor: 'rgb(139, 92, 246)',
      backgroundColor: 'rgba(139, 92, 246, 0.05)',
      borderDash: [5, 5],
      fill: true,
      tension: 0.3
    })
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: !!title, text: title }
    },
    scales: {
      y: { beginAtZero: true },
      x: { grid: { display: false } }
    }
  }

  return (
    <div className="h-[280px]">
      <Line data={chartData} options={options} />
    </div>
  )
}
