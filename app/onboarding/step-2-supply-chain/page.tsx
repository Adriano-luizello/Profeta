"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProfetaLogo } from "@/components/profeta/ProfetaLogo";

const DEFAULTS = {
  default_lead_time_days: 30,
  default_moq: 100,
  stockout_warning_days: 14,
};

const STEP = 2;
const TOTAL = 3;

export default function OnboardingStep2Page() {
  const [leadTime, setLeadTime] = useState(String(DEFAULTS.default_lead_time_days));
  const [moq, setMoq] = useState(String(DEFAULTS.default_moq));
  const [stockoutDays, setStockoutDays] = useState(String(DEFAULTS.stockout_warning_days));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/step-2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_lead_time_days: parseInt(leadTime, 10) || DEFAULTS.default_lead_time_days,
          default_moq: parseInt(moq, 10) || DEFAULTS.default_moq,
          stockout_warning_days: parseInt(stockoutDays, 10) || DEFAULTS.stockout_warning_days,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao salvar");
      router.push("/onboarding/step-3-upload");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-profeta-surface px-4 py-8">
      <div className="max-w-2xl w-full mx-auto">
        <header className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2">
            <ProfetaLogo size={32} variant="default" />
            <span className="font-display text-lg text-profeta-primary font-medium">Profeta</span>
          </Link>
          <span className="text-sm text-profeta-secondary">Step {STEP} de {TOTAL}</span>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-profeta-green hover:underline"
          >
            Pular setup →
          </Link>
        </header>

        <div className="h-1 rounded-full bg-profeta-border overflow-hidden mb-8">
          <div
            className="h-full bg-profeta-green transition-all duration-300"
            style={{ width: `${(STEP / TOTAL) * 100}%` }}
          />
        </div>

        <div className="bg-white rounded-2xl border border-profeta-border p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-profeta-primary mb-2">
            Supply chain
          </h2>
          <p className="text-sm text-profeta-secondary mb-6">
            Configure padrões de lead time, MOQ e alertas. Você pode alterar depois.
          </p>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 text-red-600 px-4 py-3 text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="leadTime" className="block text-sm font-medium text-profeta-primary mb-2">
                Lead time padrão (dias)
              </label>
              <input
                id="leadTime"
                type="number"
                min={1}
                max={365}
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-profeta-border bg-white text-profeta-primary focus:outline-none focus:ring-2 focus:ring-profeta-green/20 focus:border-profeta-green"
              />
            </div>
            <div>
              <label htmlFor="moq" className="block text-sm font-medium text-profeta-primary mb-2">
                MOQ padrão (unidades)
              </label>
              <input
                id="moq"
                type="number"
                min={0}
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-profeta-border bg-white text-profeta-primary focus:outline-none focus:ring-2 focus:ring-profeta-green/20 focus:border-profeta-green"
              />
            </div>
            <div>
              <label htmlFor="stockoutDays" className="block text-sm font-medium text-profeta-primary mb-2">
                Alerta de stockout (dias antes)
              </label>
              <input
                id="stockoutDays"
                type="number"
                min={1}
                max={90}
                value={stockoutDays}
                onChange={(e) => setStockoutDays(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-profeta-border bg-white text-profeta-primary focus:outline-none focus:ring-2 focus:ring-profeta-green/20 focus:border-profeta-green"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-profeta-green py-3 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Salvando..." : "Continuar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
