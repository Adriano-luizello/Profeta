import Link from "next/link";
import { SuppliersSettings } from "@/components/SuppliersSettings";
import { ClearDataButton } from "@/components/ClearDataButton";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-profeta-text-primary">
          Configurações
        </h1>
        <p className="mt-0.5 text-sm text-profeta-text-secondary">
          Supply chain,{" "}
          <Link
            href="/dashboard/settings#fornecedores"
            className="text-profeta-green hover:underline"
          >
            fornecedores
          </Link>{" "}
          e preferências. Adicione, edite ou remova fornecedores abaixo.
        </p>
      </div>

      <div className="rounded-card border border-profeta-border bg-profeta-card p-6 shadow-card">
        <SuppliersSettings />
      </div>

      <div className="rounded-card border border-profeta-border bg-profeta-card p-6 shadow-card">
        <h2 className="mb-4 text-lg font-semibold text-profeta-text-primary">
          Dados
        </h2>
        <ClearDataButton />
      </div>
    </div>
  );
}
