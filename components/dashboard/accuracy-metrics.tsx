"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface MetricsData {
  mean?: number
  std?: number
  trend?: string
  mape?: number | null
  mae?: number | null
  accuracy_level?: string
  sample_size?: number
}

interface AccuracyMetricsProps {
  metrics: MetricsData
  productName?: string
}

export function AccuracyMetrics({ metrics, productName }: AccuracyMetricsProps) {
  const { mape, mae, accuracy_level, sample_size, mean, trend } = metrics

  const getBadgeVariant = (level?: string): { variant: "default" | "secondary" | "destructive" | "outline"; className?: string } => {
    switch (level) {
      case "excellent":
        return { variant: "default", className: "bg-green-600 text-white border-green-600 hover:bg-green-600/90" }
      case "good":
        return { variant: "outline", className: "border-amber-500 text-amber-700 dark:text-amber-400" }
      case "needs_improvement":
        return { variant: "destructive" as const }
      case "insufficient_data":
      default:
        return { variant: "secondary" as const }
    }
  }

  const getBadgeLabel = (level?: string) => {
    switch (level) {
      case "excellent":
        return "🟢 Excelente"
      case "good":
        return "🟡 Bom"
      case "needs_improvement":
        return "🔴 Precisa Melhorar"
      case "insufficient_data":
        return "⚪ Dados Insuficientes"
      default:
        return "⚪ N/A"
    }
  }

  const badgeInfo = getBadgeVariant(accuracy_level)
  const badgeLabel = getBadgeLabel(accuracy_level)

  const getTrendIcon = () => {
    switch (trend) {
      case "increasing":
      case "growing":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "decreasing":
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const hasMetrics = mape !== null && mape !== undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Acurácia do Modelo
          {productName && (
            <span className="text-sm font-normal text-muted-foreground">
              - {productName}
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Métricas de qualidade da previsão
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasMetrics ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  MAPE (Erro Médio %)
                </span>
                <span className="text-2xl font-bold">
                  {mape?.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={Math.max(0, 100 - (mape || 0))}
                className="h-2"
              />
              <div className="flex justify-between items-center">
                <Badge variant={badgeInfo.variant} className={badgeInfo.className}>
                  {badgeLabel}
                </Badge>
                {sample_size != null && (
                  <span className="text-xs text-muted-foreground">
                    {sample_size} pontos de validação
                  </span>
                )}
              </div>
            </div>

            {mae !== null && mae !== undefined && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    MAE (Erro Absoluto)
                  </span>
                  <span className="text-xl font-bold">
                    {mae.toFixed(0)} un
                  </span>
                </div>
              </div>
            )}

            {mean !== undefined && (
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Média Histórica</span>
                  <span className="font-medium">{mean.toFixed(0)} un</span>
                </div>
                {trend && (
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-muted-foreground">Tendência</span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon()}
                      <span className="font-medium capitalize">
                        {trend === "increasing" ? "Crescente" : trend === "decreasing" ? "Decrescente" : "Estável"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!mean && trend && (
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Tendência</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon()}
                    <span className="font-medium capitalize">
                      {trend === "increasing" ? "Crescente" : trend === "decreasing" ? "Decrescente" : "Estável"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                🟢 MAPE &lt; 20% = Excelente |
                🟡 20-50% = Bom |
                🔴 &gt; 50% = Precisa Melhorar
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">
              {getBadgeLabel(accuracy_level)}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              São necessários pelo menos 20 pontos de dados históricos para calcular
              métricas de acurácia via backtesting (ex.: 20 meses).
            </p>
            {sample_size != null && (
              <p className="text-xs text-muted-foreground mt-2">
                Atual: {sample_size} pontos
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
