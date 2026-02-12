'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'

export function ClearDataButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successCounts, setSuccessCounts] = useState<{ analyses: number; suppliers: number } | null>(null)

  const handleClear = async () => {
    const ok = window.confirm(
      'Tem certeza? Isso apagará TUDO do dashboard: análises, produtos, histórico de vendas (unidades e dias de vendas), previsões, recomendações, alertas e fornecedores. Esta ação não pode ser desfeita.'
    )
    if (!ok) return

    setLoading(true)
    setError(null)
    setSuccess(false)
    setSuccessCounts(null)

    try {
      const res = await fetch('/api/analyses', { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao limpar dados')
      }

      setSuccess(true)
      if (data.deletedAnalyses != null || data.deletedSuppliers != null) {
        setSuccessCounts({
          analyses: data.deletedAnalyses ?? data.deleted ?? 0,
          suppliers: data.deletedSuppliers ?? 0,
        })
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao limpar dados')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-profeta-amber/30 bg-profeta-amber/5 p-4">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-profeta-text-primary">
            <Trash2 className="h-4 w-4 text-profeta-amber" />
            Limpar todos os dados
          </h3>
          <p className="mt-1 text-sm text-profeta-text-secondary">
            Remove tudo do dashboard: análises, produtos, histórico de vendas
            (unidades e dias), previsões, recomendações, alertas e fornecedores.
            Use para recomeçar do zero.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-profeta-red px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-profeta-red/90 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Apagando…
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              Limpar dados
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Erro</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex gap-2 rounded-xl border border-profeta-green/30 bg-profeta-green/5 p-4">
          <div>
            <p className="font-medium text-profeta-green">Dados apagados</p>
            <p className="mt-1 text-sm text-profeta-text-secondary">
              Todos os dados do dashboard foram removidos (análises, vendas,
              previsões, recomendações, alertas e fornecedores).
              {successCounts && (
                <span className="mt-2 block text-profeta-text-primary">
                  {successCounts.analyses} análise(s) e {successCounts.suppliers}{' '}
                  fornecedor(es) removidos.
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
