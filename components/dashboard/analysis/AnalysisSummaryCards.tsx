'use client'

import { Card, CardContent } from '@/components/ui/card'

interface SummaryData {
  totalProducts: number
  totalCategories: number
  totalSales: number
  averageMAPE: number | null
  totalForecastPeriod?: number
  selectedPeriod?: 30 | 60 | 90
}

interface AnalysisSummaryCardsProps {
  data: SummaryData
}

export function AnalysisSummaryCards({ data }: AnalysisSummaryCardsProps) {
  const {
    totalProducts,
    totalCategories,
    totalSales,
    averageMAPE,
    totalForecastPeriod,
    selectedPeriod = 30,
  } = data
  const showForecast = totalForecastPeriod != null
  return (
    <div className={`grid gap-4 w-full ${showForecast ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
      <Card className="min-w-0 overflow-hidden">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Total de Produtos</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {totalProducts}
          </p>
        </CardContent>
      </Card>
      <Card className="min-w-0 overflow-hidden">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Categorias</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {totalCategories}
          </p>
        </CardContent>
      </Card>
      <Card className="min-w-0 overflow-hidden">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Vendas (histórico)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {totalSales > 0 ? totalSales.toLocaleString('pt-BR') : '—'}
          </p>
        </CardContent>
      </Card>
      <Card className="min-w-0 overflow-hidden">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">MAPE médio</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {averageMAPE != null ? `${averageMAPE}%` : '—'}
          </p>
        </CardContent>
      </Card>
      {showForecast && (
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Previsão {selectedPeriod}d</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {totalForecastPeriod > 0
                ? Math.round(totalForecastPeriod).toLocaleString('pt-BR')
                : '—'}{' '}
              un
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
