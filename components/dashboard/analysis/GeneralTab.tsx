'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ForecastSection } from '@/components/ForecastSection'
import { ForecastChart } from '@/components/ForecastChart'
import {
  getAggregatedChartData,
  getCategoryChartData,
  getTopProducts,
  getWorstProducts,
  calculateAlerts,
} from '@/lib/analysis-helpers'
import type { ForecastResponse } from '@/types/forecasting'
import { AnalysisSummaryCards } from './AnalysisSummaryCards'
import { TopProductsCard } from './TopProductsCard'
import { WorstProductsCard } from './WorstProductsCard'
import { AlertsCard } from './AlertsCard'
import { RecommendationsSection } from './RecommendationsSection'

interface SummaryData {
  totalProducts: number
  totalCategories: number
  totalSales: number
  averageMAPE: number | null
  totalForecastPeriod?: number
  selectedPeriod?: 30 | 60 | 90
}

interface GeneralTabProps {
  forecast: ForecastResponse | null
  analysisId: string
  onGenerate: () => Promise<void>
  generating: boolean
  error: string | null
  summaryData?: SummaryData
  selectedPeriod?: 30 | 60 | 90
}

export function GeneralTab({
  forecast,
  analysisId,
  onGenerate,
  generating,
  error,
  summaryData,
  selectedPeriod = 30,
}: GeneralTabProps) {
  const [viewMode, setViewMode] = useState<'total' | 'category'>('total')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const selectedHorizon = `${selectedPeriod}d` as '30d' | '60d' | '90d'

  if (!forecast) {
    return (
      <ForecastSection
        analysisId={analysisId}
        showPrevisaoCard={true}
        forecast={null}
        onGenerate={onGenerate}
        generating={generating}
        error={error}
      />
    )
  }

  const chartData =
    viewMode === 'total' || selectedCategory === 'all'
      ? getAggregatedChartData(forecast)
      : getCategoryChartData(forecast, selectedCategory)

  const topProducts = getTopProducts(forecast, 5, selectedPeriod)
  const worstProducts = getWorstProducts(forecast, 5, selectedPeriod)
  const alerts = calculateAlerts(forecast)
  const categories = forecast.category_forecasts ?? []

  return (
    <div className="space-y-6">
      {summaryData && (
        <AnalysisSummaryCards data={summaryData} />
      )}
      <div className="flex flex-wrap gap-4">
        <Select value={viewMode} onValueChange={(v: 'total' | 'category') => setViewMode(v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="total">📊 Todas Vendas</SelectItem>
            <SelectItem value="category">🏷️ Por Categoria</SelectItem>
          </SelectContent>
        </Select>

        {viewMode === 'category' && (
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Selecione categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.category} value={cat.category}>
                  {cat.category} ({cat.product_count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            📈{' '}
            {viewMode === 'total'
              ? 'Vendas Totais'
              : selectedCategory === 'all'
                ? 'Por Categoria'
                : `Categoria: ${selectedCategory}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-sm text-muted-foreground">
            Exibindo previsão para {selectedPeriod} dias
          </div>
          <div className="h-[400px] min-h-[400px] w-full">
            <ForecastChart
              historical={chartData.historical}
              forecast30d={chartData.forecast30d}
              forecast60d={chartData.forecast60d}
              forecast90d={chartData.forecast90d}
              selectedHorizon={selectedHorizon}
              productName={viewMode === 'total' ? 'Total' : selectedCategory}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3 w-full">
        <TopProductsCard products={topProducts} selectedPeriod={selectedPeriod} />
        <WorstProductsCard products={worstProducts} selectedPeriod={selectedPeriod} />
        <AlertsCard alerts={alerts} />
      </div>

      <RecommendationsSection forecast={forecast} />
    </div>
  )
}
