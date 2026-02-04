'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ForecastResponse } from '@/types/forecasting'
import { calculateAlerts } from '@/lib/analysis-helpers'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface RecommendationsSectionProps {
  forecast: ForecastResponse
}

export function RecommendationsSection({ forecast }: RecommendationsSectionProps) {
  const alerts = calculateAlerts(forecast)
  const forAttention = (forecast.product_forecasts ?? []).filter(
    (pf) =>
      pf.recommendations.suggested_quantity != null &&
      pf.recommendations.suggested_quantity > 0
  )

  return (
    <div className="space-y-4 w-full">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        💡 Recomendações
      </h3>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Reorder Alerts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Produtos com sugestão de reabastecimento
          </p>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum produto requer reabastecimento no momento.
            </p>
          ) : (
            <ul className="space-y-3">
              {alerts.map((a) => (
                <li
                  key={a.product_id}
                  className="flex flex-wrap items-center gap-2 text-sm p-3 rounded-lg bg-muted/50"
                >
                  <span className="font-medium">{a.product_name}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>
                    {a.suggested_quantity} un
                    {a.restock_date &&
                      ` até ${format(new Date(a.restock_date), 'dd/MM/yyyy', { locale: ptBR })}`}
                  </span>
                  <span className="text-muted-foreground text-xs flex-1 truncate max-w-md" title={a.reasoning}>
                    {a.reasoning}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Produtos para Atenção</CardTitle>
          <p className="text-sm text-muted-foreground">
            {forAttention.length} produto(s) com recomendação ativa
          </p>
        </CardHeader>
        <CardContent>
          {forAttention.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum produto para atenção.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {forAttention.map((pf) => (
                <div
                  key={pf.product_id}
                  className="p-3 rounded-lg border bg-card text-card-foreground"
                >
                  <p className="font-medium text-sm">{pf.product_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pf.recommendations.reasoning}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
