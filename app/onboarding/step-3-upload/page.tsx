"use client";

import Link from "next/link";
import { ProfetaLogo } from "@/components/profeta/ProfetaLogo";

const STEP = 3;
const TOTAL = 3;

export default function OnboardingStep3Page() {
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

        <div className="bg-white rounded-2xl border border-profeta-border p-8 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-profeta-primary mb-2">
            Envie seus dados
          </h2>
          <p className="text-sm text-profeta-secondary mb-6">
            Faça upload do histórico de vendas em CSV para começar as previsões.
          </p>
          <Link
            href="/dashboard/upload"
            className="inline-block w-full rounded-xl bg-profeta-green py-3 text-white font-semibold hover:opacity-90 transition-opacity text-center"
          >
            Ir para Upload
          </Link>
          <p className="mt-4 text-sm text-profeta-secondary">
            Ou{" "}
            <Link href="/dashboard" className="text-profeta-green font-medium hover:underline">
              acessar o dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
