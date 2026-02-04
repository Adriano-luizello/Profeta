'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AlertItem } from '@/lib/analysis-helpers'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AlertsCardProps {
  alerts: AlertItem[]
}

export function AlertsCard({ alerts }: AlertsCardProps) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          ⚠️ Alertas de Reabastecimento
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum alerta</p>
        ) : (
          <ul className="space-y-3">
            {alerts.slice(0, 5).map((a) => (
              <li key={a.product_id} className="text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                <p className="font-medium truncate" title={a.product_name}>
                  {a.product_name}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Sugestão: {a.suggested_quantity ?? '—'} un
                  {a.restock_date &&
                    ` · ${format(new Date(a.restock_date), 'dd/MM/yyyy', { locale: ptBR })}`}
                </p>
              </li>
            ))}
            {alerts.length > 5 && (
              <p className="text-xs text-muted-foreground pt-1">
                +{alerts.length - 5} outros
              </p>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
