"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProfetaLogo } from "@/components/profeta/ProfetaLogo";

const STEP = 1;
const TOTAL = 3;

export default function OnboardingStep1Page() {
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/step-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao salvar");
      router.push("/onboarding/step-2-supply-chain");
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
            Nome da empresa
          </h2>
          <p className="text-sm text-profeta-secondary mb-6">
            Como sua empresa ou loja se chama?
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 text-red-600 px-4 py-3 text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-profeta-primary mb-2">
                Nome
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                placeholder="Minha Loja"
                className="w-full px-4 py-3 rounded-xl border border-profeta-border bg-white text-profeta-primary placeholder-profeta-muted focus:outline-none focus:ring-2 focus:ring-profeta-green/20 focus:border-profeta-green"
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
