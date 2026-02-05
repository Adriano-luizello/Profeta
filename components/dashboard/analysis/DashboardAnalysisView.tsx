'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnalysisHeader } from './AnalysisHeader'
import { AnalysisSummaryCards } from './AnalysisSummaryCards'
import { GeneralTab } from './GeneralTab'
import { ProductsTab } from './ProductsTab'
import { PeriodSelector } from '@/components/dashboard/PeriodSelector'
import {
  calculateTotalSales,
  calculateAverageMAPE,
} from '@/lib/analysis-helpers'
import type { ForecastResponse } from '@/types/forecasting'
import type { TimeHorizon } from '@/lib/types/dashboard'

interface Analysis {
  id: string
  file_name: string
  total_products: number
  created_at: string
}

interface Product {
  id: string
  original_name: string
  cleaned_name: string | null
  refined_category: string | null
  sku?: string | null
}

interface DashboardAnalysisViewProps {
  analysis: Analysis
  products: Product[]
  /** Forecast from server (latest analysis). Null when not yet generated or pipeline failed. */
  forecast: ForecastResponse | null
  analysisId: string
}

export function DashboardAnalysisView({
  analysis,
  products,
  forecast,
  analysisId,
}: DashboardAnalysisViewProps) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<TimeHorizon>(30)

  const handleGenerate = useCallback(async () => {
    try {
      setGenerating(true)
      setError(null)
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
        const data = await response.json().catch(() => ({}))
        const message = typeof data?.error === 'string' ? data.error : 'Erro ao gerar forecast'
        throw new Error(message)
      }
      setError(null)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar forecast')
    } finally {
      setGenerating(false)
    }
  }, [analysisId, router])

  const totalProducts = forecast?.stats?.total_products ?? analysis.total_products
  const totalCategories =
    forecast?.stats?.categories ??
    new Set(products.map((p) => p.refined_category || 'Sem categoria').filter(Boolean)).size
  const totalSales = forecast ? calculateTotalSales(forecast) : 0
  const averageMAPE = forecast ? calculateAverageMAPE(forecast) : null
  const totalForecastPeriod = forecast
    ? (forecast.product_forecasts ?? []).reduce((sum, pf) => {
        const key = `forecast_${selectedPeriod}d` as 'forecast_30d' | 'forecast_60d' | 'forecast_90d'
        const arr = pf[key] ?? []
        return sum + arr.reduce((s, d) => s + d.predicted_quantity, 0)
      }, 0)
    : 0

  const summaryData = {
    totalProducts,
    totalCategories,
    totalSales,
    averageMAPE,
    totalForecastPeriod,
    selectedPeriod,
  }

  const productsFromDb = products.map((p) => ({
    id: p.id,
    name: p.cleaned_name || p.original_name,
    category: p.refined_category || '',
    sku: p.sku ?? undefined,
  }))

  const productIdToSku = Object.fromEntries(
    products.filter((p) => p.sku != null && p.sku.trim() !== '').map((p) => [p.id, p.sku!])
  ) as Record<string, string>

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <AnalysisHeader
          fileName={analysis.file_name}
          createdAt={analysis.created_at}
          totalProducts={totalProducts}
          showBackLink={false}
        />
        {forecast && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Período:</span>
            <PeriodSelector
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              disabled={!forecast}
            />
          </div>
        )}
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="general">📊 Geral</TabsTrigger>
          <TabsTrigger value="products">📦 Produtos</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab
            forecast={forecast}
            analysisId={analysisId}
            onGenerate={handleGenerate}
            generating={generating}
            error={error}
            summaryData={summaryData}
            selectedPeriod={selectedPeriod}
          />
        </TabsContent>

        <TabsContent value="products">
          <ProductsTab
            forecast={forecast}
            productsFromDb={productsFromDb}
            productIdToSku={productIdToSku}
            selectedPeriod={selectedPeriod}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
