'use client';

import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { TopProductsTable } from '@/components/dashboard/TopProductsTable';
import { useDashboard } from '@/hooks/useDashboard';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DashboardModelRouterPage() {
  const params = useParams();
  const analysisId = params?.analysisId as string | undefined;

  const { period, setPeriod, data, loading, error } = useDashboard(
    analysisId ?? '',
    30
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar dashboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTitle>Sem dados</AlertTitle>
          <AlertDescription>
            Nenhum dado disponível para esta análise.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const apiError = (data as { error?: string }).error;
  const summary = data.summary ?? {};
  const actions = data.actions ?? {
    critical: [],
    attention: [],
    opportunity: [],
    counts: { critical: 0, attention: 0, opportunity: 0 },
  };
  const topBest = data.top_best ?? [];
  const topWorst = data.top_worst ?? [];
  const allProducts = data.all_products ?? [];

  return (
    <div className="container mx-auto space-y-6 p-6">
      {apiError && (
        <Alert variant="destructive">
          <AlertTitle>Aviso do backend</AlertTitle>
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}
      {/* Header com Período Selector */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Model Router</h1>
          <p className="mt-1 text-muted-foreground">
            Análise: {data.analysis_id?.slice(0, 8)}... • Gerado em{' '}
            {data.generated_at
              ? new Date(data.generated_at).toLocaleString('pt-BR')
              : '—'}
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Summary Cards */}
      <SummaryCards
        summary={summary}
        actions={actions}
        period={period}
      />

      {/* Top Melhores e Piores */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopProductsTable
          products={topBest}
          title="Top 5 Melhores Produtos (MAPE)"
          type="best"
          period={period}
          analysisId={data.analysis_id}
        />
        <TopProductsTable
          products={topWorst}
          title="Top 5 Piores Produtos"
          type="worst"
          period={period}
          analysisId={data.analysis_id}
        />
      </div>

      {/* Informações Adicionais */}
      <div className="pt-4 text-center text-sm text-muted-foreground">
        <p>
          Total de produtos analisados: {allProducts.length} • Modelo
          predominante: {summary.predominant_model ?? '—'}
        </p>
      </div>
    </div>
  );
}
