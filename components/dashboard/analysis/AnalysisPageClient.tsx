'use client'

import { useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnalysisHeader } from './AnalysisHeader'
import { GeneralTab } from './GeneralTab'
import { ProductsTab } from './ProductsTab'
import {
  calculateTotalSales,
  calculateAverageMAPE,
} from '@/lib/analysis-helpers'
import type { ForecastResponse } from '@/types/forecasting'

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

interface AnalysisPageClientProps {
  analysis: Analysis
  products: Product[]
  analysisId: string
}

export function AnalysisPageClient({
  analysis,
  products,
  analysisId,
}: AnalysisPageClientProps) {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao gerar forecast')
      }
      const data: ForecastResponse = await response.json()
      setForecast(data)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar forecast')
    } finally {
      setGenerating(false)
    }
  }, [analysisId])

  const totalProducts = forecast?.stats?.total_products ?? analysis.total_products
  const totalCategories =
    forecast?.stats?.categories ??
    new Set(products.map((p) => p.refined_category || 'Sem categoria').filter(Boolean)).size
  const totalSales = forecast ? calculateTotalSales(forecast) : 0
  const averageMAPE = forecast ? calculateAverageMAPE(forecast) : null

  const summaryData = {
    totalProducts,
    totalCategories,
    totalSales,
    averageMAPE,
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
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <AnalysisHeader
        fileName={analysis.file_name}
        createdAt={analysis.created_at}
        totalProducts={totalProducts}
        showBackLink={true}
      />

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
          />
        </TabsContent>

        <TabsContent value="products">
          <ProductsTab
            forecast={forecast}
            productsFromDb={productsFromDb}
            productIdToSku={productIdToSku}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
