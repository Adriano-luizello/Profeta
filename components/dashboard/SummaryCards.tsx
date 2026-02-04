'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type {
  DashboardSummary,
  DashboardActions,
  TimeHorizon,
  ModelType,
} from '@/lib/types/dashboard';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface SummaryCardsProps {
  summary: DashboardSummary;
  actions: DashboardActions;
  period: TimeHorizon;
}

export function SummaryCards({
  summary,
  actions,
  period,
}: SummaryCardsProps) {
  const counts = actions?.counts ?? {
    critical: 0,
    attention: 0,
    opportunity: 0,
  };
  const totalForecast = summary?.total_forecast ?? 0;
  const avgConfidence = summary?.avg_confidence ?? 0;
  const avgMape = summary?.avg_mape ?? 0;
  const improvementVsProphet = summary?.improvement_vs_prophet ?? 0;
  const forecastChangePct = summary?.forecast_change_pct ?? 0;
  const predominantModel = (summary?.predominant_model ?? 'xgboost') as ModelType;

  return (
    <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
      {/* Card 1: Ações Críticas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ações Críticas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Urgentes</span>
            <Badge variant="destructive">{counts.critical}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Planejadas</span>
            <Badge
              variant="secondary"
              className="bg-yellow-500 text-white dark:bg-yellow-600"
            >
              {counts.attention}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Oportunidades</span>
            <Badge variant="default" className="bg-green-600">
              {counts.opportunity}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Previsão */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Previsão {period} Dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {totalForecast.toLocaleString('pt-BR')} un
          </div>
          {forecastChangePct !== 0 && (
            <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
              {forecastChangePct > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              {Math.abs(forecastChangePct).toFixed(1)}% vs mês anterior
            </div>
          )}
          <div className="mt-1 text-sm text-muted-foreground">
            Confiança: {avgConfidence.toFixed(1)}%
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Acurácia */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Acurácia Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            MAPE: {avgMape.toFixed(1)}%
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {improvementVsProphet.toFixed(0)}x melhor que Prophet
          </div>
          <Badge className="mt-2 capitalize">
            Modelo: {predominantModel}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
