import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Upload } from "lucide-react";
import {
  getLatestAnalysisWithDetails,
  getDashboardKpis,
  getDeadStockMetrics,
  getRevenueByProduct,
  getSupplyChainBySupplier,
  getCapitalDistribution,
} from "@/lib/dashboard-data";
import { getSupplyChainMetrics } from "@/lib/supply-chain";
import { EmptyState, DashboardContent } from "@/components/profeta";

export default async function DashboardPage() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const analysis = await getLatestAnalysisWithDetails(supabase, user.id);

    if (!analysis) {
      return (
        <div className="min-h-full bg-profeta-bg">
          <div className="border-b border-profeta-border bg-profeta-card/50 px-4 py-4 sm:px-6">
            <div className="mx-auto flex max-w-[1300px] flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-[26px] font-bold text-profeta-text-primary">
                  Dashboard
                </h2>
                <p className="text-[13px] text-profeta-text-muted">
                  Vendas e projeções da sua loja. Envie dados em Upload para
                  começar.
                </p>
              </div>
              <Link
                href="/dashboard/upload"
                className="inline-flex items-center gap-2 rounded-component border border-profeta-border bg-profeta-card px-4 py-2 text-sm font-medium text-profeta-text-primary shadow-card hover:shadow-card-hover"
              >
                <Upload className="h-4 w-4" />
                Upload de dados
              </Link>
            </div>
          </div>
          <EmptyState />
        </div>
      );
    }

    // Fetch 90d and all 3 periods for revenueByProduct in parallel (Opção A)
    const [
      kpis,
      supplyChain,
      deadStock,
      revenueByProduct30,
      revenueByProduct60,
      revenueByProduct90,
      supplyBySupplier,
      capitalDistribution,
    ] = await Promise.all([
      getDashboardKpis(supabase, user.id),
      getSupplyChainMetrics(supabase, user.id),
      getDeadStockMetrics(supabase, user.id),
      getRevenueByProduct(supabase, user.id, 30),
      getRevenueByProduct(supabase, user.id, 60),
      getRevenueByProduct(supabase, user.id, 90),
      getSupplyChainBySupplier(supabase, user.id),
      getCapitalDistribution(supabase, user.id),
    ]);

    const revenueByProductMap = {
      30: revenueByProduct30,
      60: revenueByProduct60,
      90: revenueByProduct90,
    } as const;

    return (
      <DashboardContent
        kpis={kpis}
        supplyChain={supplyChain}
        deadStock={deadStock}
        analysis={analysis}
        supplyBySupplier={supplyBySupplier}
        capitalDistribution={capitalDistribution}
        revenueByProductMap={revenueByProductMap}
      />
    );
  } catch (err) {
    console.error("[DashboardPage] Error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return (
      <div className="mx-auto max-w-xl space-y-4 p-8">
        <h2 className="text-lg font-semibold text-profeta-text-primary">
          Erro ao carregar o dashboard
        </h2>
        <p className="text-sm text-profeta-text-secondary">
          {message}
        </p>
        <a
          href="/dashboard"
          className="inline-block text-sm text-profeta-green hover:underline"
        >
          Tentar novamente
        </a>
      </div>
    );
  }
}
