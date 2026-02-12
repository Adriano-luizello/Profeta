"use client";

import { useState, useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartData,
} from "chart.js";
import Link from "next/link";
import {
  DollarSign,
  Package,
  AlertTriangle,
  TrendingUp,
  Upload,
} from "lucide-react";
import {
  KPICard,
  Topbar,
  InsightBox,
  StockBar,
  PeriodSelector,
  ProductsTabContent,
} from "@/components/profeta";
import { useDashboardChat } from "@/components/dashboard/DashboardChatContext";
import { cn } from "@/lib/utils";
import type {
  DashboardKpis,
  RevenueByProductRow,
  SupplyChainBySupplierRow,
  CapitalDistributionRow,
} from "@/lib/dashboard-data";
import type { SupplyChainMetrics } from "@/lib/supply-chain";
import type { DeadStockMetrics } from "@/lib/dashboard-data";
import type { LatestAnalysisRow } from "@/lib/dashboard-data";

ChartJS.register(ArcElement, Tooltip, Legend);

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const SUPPLY_CHAIN_PROMPT =
  "Mostre a análise completa de supply chain com reorder points, alertas hierárquicos e projeção de ruptura dos meus produtos.";
const ESTOQUE_PARADO_PROMPT =
  "Analise meu estoque parado: quais produtos estão sem venda, qual o capital preso e quais devem ser descontinuados?";
const PARETO_PROMPT =
  "Mostre a análise Pareto 80/20: quais produtos geram 80% da receita e quais bottom sellers têm capital preso.";

export interface DashboardContentProps {
  kpis: DashboardKpis;
  supplyChain: SupplyChainMetrics[];
  deadStock: DeadStockMetrics[];
  analysis: LatestAnalysisRow;
  supplyBySupplier: SupplyChainBySupplierRow[];
  capitalDistribution: CapitalDistributionRow;
  revenueByProductMap: {
    30: RevenueByProductRow[];
    60: RevenueByProductRow[];
    90: RevenueByProductRow[];
  };
}

function formatRevenue(value: number): string {
  return BRL.format(value);
}

export function DashboardContent({
  kpis,
  supplyChain,
  deadStock,
  analysis,
  supplyBySupplier,
  capitalDistribution,
  revenueByProductMap,
}: DashboardContentProps) {
  const triggerChat = useDashboardChat();
  const [activeTab, setActiveTab] = useState<"general" | "products">("general");
  const [period, setPeriod] = useState(30);

  // Dados do período selecionado (instantâneo, sem round-trip)
  const revenueByProduct = revenueByProductMap[period as 30 | 60 | 90];
  const revenueForPeriod = useMemo(
    () => revenueByProduct.reduce((s, p) => s + p.total_revenue, 0),
    [revenueByProduct]
  );
  const unitsForPeriod = useMemo(
    () => revenueByProduct.reduce((s, p) => s + p.total_quantity, 0),
    [revenueByProduct]
  );

  // KPI: Receita no período ou fallback para unidades
  const hasRevenue = revenueForPeriod > 0;
  const hasUnits = unitsForPeriod > 0;
  const receitaLabel = hasRevenue
    ? `Receita ${period}d`
    : hasUnits
      ? `Vendas ${period}d`
      : `Receita ${period}d`;
  const receitaValue = hasRevenue
    ? formatRevenue(revenueForPeriod)
    : hasUnits
      ? `${unitsForPeriod.toLocaleString("pt-BR")} un.`
      : "—";
  const receitaSub = hasRevenue
    ? `Últimos ${period} dias`
    : hasUnits
      ? `Unidades nos últimos ${period}d`
      : "Sem dados no período";

  // Urgency counts
  const criticalCount = supplyChain.filter(
    (m) => m.urgency_level === "critical"
  ).length;
  const attentionCount = supplyChain.filter(
    (m) => m.urgency_level === "attention"
  ).length;
  const okCount = supplyChain.filter(
    (m) =>
      m.urgency_level === "ok" || m.urgency_level === "informative"
  ).length;

  // Dead stock count
  const deadCount = deadStock.filter((d) => d.status === "dead").length;

  // Top 5 Produtos (revenueByProduct respeita period selector)
  const grandTotalRevenue =
    revenueByProduct.length > 0
      ? revenueByProduct.reduce((s, p) => s + p.total_revenue, 0)
      : 0;
  const top5 = revenueByProduct.slice(0, 5).map((p, i) => ({
    product_id: p.product_id,
    product_name: p.cleaned_name,
    total_revenue: p.total_revenue,
    contribution_pct: grandTotalRevenue > 0 ? (p.total_revenue / grandTotalRevenue) * 100 : 0,
    rank: i + 1,
  }));
  const top5Pct =
    top5.length > 0
      ? top5.reduce((s, p) => s + p.contribution_pct, 0).toFixed(1)
      : "0";

  // Donut: Confortável, Atenção, Crítico, Parado
  const donutCategories = [
    { label: "Confortável", value: okCount, color: "#52796A" },
    { label: "Atenção", value: attentionCount, color: "#D97706" },
    { label: "Crítico", value: criticalCount, color: "#DC2626" },
    { label: "Parado", value: deadCount, color: "#9CA3AF" },
  ];
  const donutData = donutCategories.filter((d) => d.value > 0);
  const totalSkus = okCount + attentionCount + criticalCount + deadCount;

  const chartData: ChartData<"doughnut"> = {
    labels: donutData.map((d) => d.label),
    datasets: [
      {
        data: donutData.map((d) => d.value),
        backgroundColor: donutData.map((d) => d.color),
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  // Capital breakdown (capitalDistribution já agrupa por status)
  const capitalOk = capitalDistribution.healthy.total;
  const capitalAttention = capitalDistribution.attention.total;
  const capitalParado = capitalDistribution.dead.total;
  const capitalTotal = capitalDistribution.total_capital;

  return (
    <div className="min-h-full bg-profeta-bg">
      <Topbar
        title="Dashboard"
        subtitle={`Análise: ${analysis.file_name} — ${analysis.total_products} produtos`}
        actions={
          <div className="flex items-center gap-3">
            <PeriodSelector value={period} onChange={setPeriod} />
            <Link
              href="/dashboard/upload"
              className="inline-flex items-center gap-2 rounded-component border border-profeta-border bg-profeta-card px-4 py-2 text-sm font-medium text-profeta-text-primary shadow-card transition-shadow hover:shadow-card-hover"
            >
              <Upload className="h-4 w-4" />
              Novo upload
            </Link>
          </div>
        }
      />

      <div className="mx-auto max-w-[1300px] space-y-6 px-4 py-6 sm:px-6">
        {/* Tab Switcher */}
        <div className="flex w-fit gap-1 rounded-xl bg-profeta-surface p-1">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "general"
                ? "bg-white text-profeta-text-primary shadow-sm"
                : "text-profeta-text-secondary hover:text-profeta-text-primary"
            )}
          >
            Visão Geral
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "products"
                ? "bg-white text-profeta-text-primary shadow-sm"
                : "text-profeta-text-secondary hover:text-profeta-text-primary"
            )}
          >
            Produtos
          </button>
        </div>

        {activeTab === "products" ? (
          <ProductsTabContent analysisId={analysis.id} />
        ) : (
      <>
        {/* 1. KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            label={receitaLabel}
            value={receitaValue}
            sub={receitaSub}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <KPICard
            label={`Unidades ${period}d`}
            value={unitsForPeriod.toLocaleString("pt-BR")}
            sub="Vendas no período"
            icon={<Package className="h-5 w-5" />}
          />
          <KPICard
            label="Produtos em risco"
            value={String(kpis.produtosEmRisco)}
            sub="Recomendação de reposição"
            icon={<AlertTriangle className="h-5 w-5" />}
            accentBg="bg-profeta-red/10"
            accentColor="text-profeta-red"
          />
          <KPICard
            label="SKUs ativos"
            value={String(analysis.total_products)}
            sub={`${deadCount} sem venda há 60+ dias`}
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </section>

        {/* 2. Urgency Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              label: "Rupturas iminentes",
              count: criticalCount,
              variant: "red" as const,
              prompt: SUPPLY_CHAIN_PROMPT,
            },
            {
              label: "Janelas abertas",
              count: attentionCount,
              variant: "amber" as const,
              prompt: SUPPLY_CHAIN_PROMPT,
            },
            {
              label: "Estoque confortável",
              count: okCount,
              variant: "green" as const,
              prompt: SUPPLY_CHAIN_PROMPT,
            },
          ].map(({ label, count, variant, prompt }) => (
            <button
              key={label}
              type="button"
              onClick={() => triggerChat?.(prompt)}
              className={cn(
                "rounded-card border border-profeta-border bg-profeta-card p-4 text-left shadow-card transition-shadow hover:shadow-card-hover",
                variant === "red" && "border-l-4 border-l-profeta-red",
                variant === "amber" && "border-l-4 border-l-profeta-amber",
                variant === "green" && "border-l-4 border-l-profeta-green"
              )}
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-profeta-text-muted">
                {label}
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-profeta-text-primary">
                {count}
              </p>
              <p className="mt-0.5 text-[11px] text-profeta-text-secondary">
                Clique para ver detalhes
              </p>
            </button>
          ))}
        </section>

        {/* 3. Top 5 + Saúde do Estoque */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top 5 Produtos */}
          <div className="rounded-card border border-profeta-border bg-profeta-card p-4 shadow-card">
            <h3 className="text-sm font-semibold text-profeta-text-primary">
              Top 5 Produtos
            </h3>
            {top5.length > 0 ? (
              <>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[320px] text-sm">
                    <thead>
                      <tr className="border-b border-profeta-border text-left text-[10px] font-medium uppercase tracking-wider text-profeta-text-muted">
                        <th className="pb-2 pr-2">#</th>
                        <th className="pb-2 pr-2">Produto</th>
                        <th className="pb-2 pr-2 text-right">Receita</th>
                        <th className="pb-2 text-right">% Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top5.map((p) => (
                        <tr
                          key={p.product_id}
                          className="border-b border-profeta-border/50 last:border-0"
                        >
                          <td className="py-2 pr-2 font-mono text-profeta-text-muted">
                            {p.rank}
                          </td>
                          <td className="max-w-[160px] truncate py-2 pr-2 text-profeta-text-primary">
                            {p.product_name}
                          </td>
                          <td className="py-2 pr-2 text-right font-mono text-profeta-text-primary">
                            {formatRevenue(p.total_revenue)}
                          </td>
                          <td className="py-2 text-right font-mono text-profeta-text-secondary">
                            {p.contribution_pct.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-profeta-text-muted">
                  Top 5 = {top5Pct}% da receita
                </p>
                <button
                  type="button"
                  onClick={() => triggerChat?.(PARETO_PROMPT)}
                  className="mt-2 text-sm font-medium text-profeta-green hover:underline"
                >
                  Ver análise Pareto →
                </button>
              </>
            ) : (
              <p className="mt-4 text-sm text-profeta-text-muted">
                Sem dados de vendas no período
              </p>
            )}
          </div>

          {/* Saúde do Estoque Donut */}
          <div className="rounded-card border border-profeta-border bg-profeta-card p-4 shadow-card">
            <h3 className="text-sm font-semibold text-profeta-text-primary">
              Saúde do Estoque
            </h3>
            {donutData.length > 0 ? (
              <div className="mt-4 flex items-center justify-center gap-8">
                <div className="relative h-[200px] w-[160px] shrink-0">
                  <Doughnut
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: "60%",
                      plugins: {
                        legend: { display: false },
                      },
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-2xl font-bold text-profeta-text-primary">
                      {totalSkus}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-profeta-text-muted">
                      SKUs
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  {donutCategories.map((d) => {
                    const pct =
                      totalSkus > 0
                        ? ((d.value / totalSkus) * 100).toFixed(0)
                        : "0";
                    return (
                      <div
                        key={d.label}
                        className="flex items-center gap-2 text-profeta-text-secondary"
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        <span>{d.label}:</span>
                        <span className="font-mono text-profeta-text-primary">
                          {d.value}
                        </span>
                        <span className="text-profeta-text-muted">({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-profeta-text-muted">
                Sem dados de supply chain
              </p>
            )}
          </div>
        </section>

        {/* 4. Pedidos Sugeridos + Capital */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pedidos Sugeridos por Fornecedor */}
          <div className="rounded-card border border-profeta-border bg-profeta-card p-4 shadow-card">
            <h3 className="text-sm font-semibold text-profeta-text-primary">
              Pedidos Sugeridos por Fornecedor
            </h3>
            {supplyBySupplier.length > 0 ? (
              <div className="mt-4 space-y-3">
                {supplyBySupplier.map((supplier) => {
                  const borderColor =
                    supplier.worst_urgency === "critical"
                      ? "border-l-profeta-red"
                      : supplier.worst_urgency === "attention"
                        ? "border-l-profeta-amber"
                        : "border-l-profeta-green";
                  const badgeLabel =
                    supplier.worst_urgency === "critical"
                      ? "Ruptura iminente"
                      : supplier.worst_urgency === "attention"
                        ? "Janela aberta"
                        : "Confortável";
                  const badgeVariant =
                    supplier.worst_urgency === "critical"
                      ? "critical"
                      : supplier.worst_urgency === "attention"
                        ? "attention"
                        : "ok";
                  return (
                    <div
                      key={supplier.supplier_name}
                      className={cn(
                        "rounded-component border-l-4 border-profeta-border bg-profeta-elevated p-3",
                        borderColor
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-profeta-text-primary">
                          {supplier.supplier_name}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium",
                            badgeVariant === "critical" &&
                              "bg-profeta-red/20 text-profeta-red",
                            badgeVariant === "attention" &&
                              "bg-profeta-amber/20 text-profeta-amber",
                            badgeVariant === "ok" &&
                              "bg-profeta-green/20 text-profeta-green"
                          )}
                        >
                          {badgeLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-profeta-text-secondary">
                        {supplier.product_count} produto(s) ·{" "}
                        {supplier.total_order_qty.toLocaleString("pt-BR")} un.
                        sugeridas · Lead time {supplier.lead_time_days}d
                        {supplier.earliest_stockout_days != null && (
                          <> · Stockout em {supplier.earliest_stockout_days}d</>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-profeta-text-muted">
                Nenhum pedido sugerido ou fornecedores não definidos
              </p>
            )}
          </div>

          {/* Capital em Estoque */}
          <div className="flex flex-col rounded-card border border-profeta-border bg-profeta-card p-6 shadow-card">
            <h3 className="mb-4 text-base font-semibold text-profeta-text-primary">
              Capital em Estoque
            </h3>
            {capitalTotal > 0 ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-profeta-text-secondary">
                      Saudável
                    </span>
                    <span className="font-mono text-profeta-text-primary">
                      {formatRevenue(capitalOk)}
                    </span>
                  </div>
                  <StockBar
                    current={capitalOk}
                    max={capitalTotal}
                    status="comfortable"
                    className="mt-1"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-profeta-text-secondary">
                      Atenção
                    </span>
                    <span className="font-mono text-profeta-text-primary">
                      {formatRevenue(capitalAttention)}
                    </span>
                  </div>
                  <StockBar
                    current={capitalAttention}
                    max={capitalTotal}
                    status="attention"
                    className="mt-1"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-profeta-text-secondary">Parado</span>
                    <span className="font-mono text-profeta-text-primary">
                      {formatRevenue(capitalParado)}
                    </span>
                  </div>
                  <StockBar
                    current={capitalParado}
                    max={capitalTotal}
                    status="critical"
                    className="mt-1"
                  />
                </div>
                <p className="border-t border-profeta-border pt-3 text-sm font-medium text-profeta-text-primary">
                  Total: {formatRevenue(capitalTotal)}
                </p>
                {capitalDistribution.dead_stock_monthly_cost > 0 && (
                  <p className="text-xs text-profeta-text-muted">
                    Custo mensal estoque parado:{" "}
                    {formatRevenue(capitalDistribution.dead_stock_monthly_cost)}
                  </p>
                )}
                {capitalParado > 0 && (
                  <InsightBox
                    icon="📦"
                    description={`R$ ${capitalParado.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} em estoque parado. Avalie descontinuação ou promoção.`}
                    variant="amber"
                    actions={
                      <button
                        type="button"
                        onClick={() => triggerChat?.(ESTOQUE_PARADO_PROMPT)}
                        className="text-sm font-medium text-profeta-green hover:underline"
                      >
                        Analisar estoque parado →
                      </button>
                    }
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-profeta-elevated">
                  <DollarSign
                    size={24}
                    className="text-profeta-text-muted"
                  />
                </div>
                <p className="mb-1 text-sm font-medium text-profeta-text-primary">
                  Sem dados de capital
                </p>
                <p className="max-w-[240px] text-xs leading-relaxed text-profeta-text-muted">
                  Para calcular o capital em estoque, adicione o estoque atual e
                  custo unitário nos dados do produto.
                </p>
                <div className="mt-4 flex gap-2">
                  <span className="rounded-badge bg-profeta-elevated px-2 py-1 text-[10px] font-medium text-profeta-text-muted">
                    Estoque atual
                  </span>
                  <span className="rounded-badge bg-profeta-elevated px-2 py-1 text-[10px] font-medium text-profeta-text-muted">
                    Custo unitário
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      </>
        )}
      </div>
    </div>
  );
}
