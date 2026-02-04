'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { totalForecastForPeriod } from '@/lib/analysis-helpers'
import type { ProductForecast } from '@/types/forecasting'

interface ProductCardProps {
  product: ProductForecast
  viewMode: 'grid' | 'list'
  /** SKU do produto (ex: coluna "Sku" do CSV); exibido abaixo do nome quando presente */
  sku?: string
  onClick: () => void
  /** Período para exibir previsão (30/60/90 dias) */
  selectedPeriod?: 30 | 60 | 90
}

export function ProductCard({
  product,
  viewMode,
  sku,
  onClick,
  selectedPeriod = 30,
}: ProductCardProps) {
  const total = totalForecastForPeriod(product, selectedPeriod)
  const trend = product.metrics.trend
  const trendLabel =
    trend === 'increasing' ? '📈' : trend === 'decreasing' ? '📉' : '➡️'

  if (viewMode === 'list') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate" title={product.product_name}>
            {product.product_name}
          </p>
          <p className="text-sm text-muted-foreground">{product.category}</p>
          {sku && (
            <p className="text-xs text-muted-foreground mt-0.5">SKU: {sku}</p>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="tabular-nums">{Math.round(total)} un ({selectedPeriod}d)</span>
          <span>{trendLabel}</span>
          {product.metrics.mape != null && (
            <Badge variant="secondary">MAPE {product.metrics.mape}%</Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card
      className="min-w-0 overflow-hidden cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      role="button"
      tabIndex={0}
    >
      <CardHeader className="pb-2">
        <p className="font-medium text-sm line-clamp-2" title={product.product_name}>
          {product.product_name}
        </p>
        <p className="text-xs text-muted-foreground">{product.category}</p>
        {sku && (
          <p className="text-xs text-muted-foreground mt-0.5">SKU: {sku}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Previsão {selectedPeriod}d</span>
          <span className="font-semibold tabular-nums">{Math.round(total)} un</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Tendência</span>
          <span>{trendLabel}</span>
        </div>
        {product.metrics.mape != null && (
          <Badge variant="secondary" className="text-xs">
            MAPE {product.metrics.mape}%
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}
