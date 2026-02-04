'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ForecastChart } from '@/components/ForecastChart'
import { AccuracyMetrics } from '@/components/dashboard/accuracy-metrics'
import type { ProductForecast } from '@/types/forecasting'

interface ProductDetailDialogProps {
  product: ProductForecast
  /** SKU do produto (ex: coluna "Sku" do CSV); exibido abaixo do nome quando presente */
  sku?: string
  onClose: () => void
}

export function ProductDetailDialog({ product, sku, onClose }: ProductDetailDialogProps) {
  const [horizon, setHorizon] = useState<'30d' | '60d' | '90d'>('30d')
  const mean =
    product.historical_data?.length > 0
      ? product.historical_data.reduce((s, d) => s + d.quantity, 0) /
        product.historical_data.length
      : undefined

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.product_name}</DialogTitle>
          <p className="text-sm text-muted-foreground">{product.category}</p>
          {sku && (
            <p className="text-xs text-muted-foreground mt-0.5">SKU: {sku}</p>
          )}
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['30d', '60d', '90d'] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  horizon === h
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {h === '30d' ? '30 dias' : h === '60d' ? '60 dias' : '90 dias'}
              </button>
            ))}
          </div>
          <div className="h-[400px] min-h-[400px] w-full overflow-hidden">
            <ForecastChart
              historical={product.historical_data ?? []}
              forecast30d={product.forecast_30d ?? []}
              forecast60d={product.forecast_60d ?? []}
              forecast90d={product.forecast_90d ?? []}
              selectedHorizon={horizon}
              productName={product.product_name}
            />
          </div>
          <AccuracyMetrics
            metrics={{
              ...product.metrics,
              mean,
            }}
            productName={product.product_name}
          />
          {product.recommendations.suggested_quantity != null &&
            product.recommendations.suggested_quantity > 0 && (
              <div className="rounded-lg border bg-muted/50 p-4 text-sm">
                <p className="font-medium mb-1">Recomendação</p>
                <p className="text-muted-foreground">
                  Reabastecer {product.recommendations.suggested_quantity} unidades
                  {product.recommendations.restock_date &&
                    ` até ${new Date(product.recommendations.restock_date).toLocaleDateString('pt-BR')}`}
                </p>
                <p className="text-muted-foreground mt-2">{product.recommendations.reasoning}</p>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
