'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
      <div className="flex items-start justify-between gap-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20 p-4">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            Limpar todos os dados
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Remove tudo do dashboard: análises, produtos, histórico de vendas (unidades e dias), previsões, recomendações, alertas e fornecedores. Use para recomeçar do zero.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClear}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Apagando…
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar dados
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20">
          <AlertTitle className="text-green-800 dark:text-green-200">
            Dados apagados
          </AlertTitle>
          <AlertDescription>
            Todos os dados do dashboard foram removidos (análises, vendas, previsões, recomendações, alertas e fornecedores).
            {successCounts && (
              <span className="block mt-2 text-green-700 dark:text-green-300">
                {successCounts.analyses} análise(s) e {successCounts.suppliers} fornecedor(es) removidos.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
