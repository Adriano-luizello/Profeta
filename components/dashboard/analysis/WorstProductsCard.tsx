'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { totalForecastForPeriod } from '@/lib/analysis-helpers'
import type { ProductForecast } from '@/types/forecasting'

interface WorstProductsCardProps {
  products: ProductForecast[]
  selectedPeriod?: 30 | 60 | 90
}

export function WorstProductsCard({ products, selectedPeriod = 30 }: WorstProductsCardProps) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          📉 Piores 5 (previsão {selectedPeriod}d)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados</p>
        ) : (
          <ul className="space-y-2">
            {products.map((pf, i) => (
              <li
                key={pf.product_id}
                className="flex justify-between items-center text-sm"
              >
                <span className="font-medium truncate max-w-[180px]" title={pf.product_name}>
                  {i + 1}. {pf.product_name}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {Math.round(totalForecastForPeriod(pf, selectedPeriod))} un
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
