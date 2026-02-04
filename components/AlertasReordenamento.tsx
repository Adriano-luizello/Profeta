'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Clock, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react'
import type { AlertaReordenamento } from '@/lib/dashboard-data'

const ALERTAS_PAGE_SIZE = 10

export interface AlertasReordenamentoProps {
  alertas: AlertaReordenamento[]
  markedRecommendationIds: string[]
}

export function AlertasReordenamento({
  alertas,
  markedRecommendationIds = []
}: AlertasReordenamentoProps) {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [markError, setMarkError] = useState<string | null>(null)
  const [justMarked, setJustMarked] = useState<Set<string>>(() => new Set())
  const markedSet = useMemo(
    () => new Set(markedRecommendationIds),
    [markedRecommendationIds]
  )
  const isMarked = (recId: string) => markedSet.has(recId) || justMarked.has(recId)
  const filtered = useMemo(
    () => alertas.filter((a) => !isMarked(a.recommendation_id)),
    [alertas, markedSet, justMarked]
  )
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / ALERTAS_PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * ALERTAS_PAGE_SIZE
  const end = Math.min(start + ALERTAS_PAGE_SIZE, total)
  const paginated = useMemo(
    () => filtered.slice(start, end),
    [filtered, start, end]
  )

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(1)
  }, [totalPages, page])

  if (alertas.length === 0) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-orange-500 dark:text-orange-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Alertas de Reordenamento
          </h3>
        </div>
        {total > ALERTAS_PAGE_SIZE && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Mostrando {start + 1}–{end} de {total}
          </span>
        )}
      </div>
      {markError && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="size-4 shrink-0" />
          {markError}
        </div>
      )}
      {total === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nenhum alerta pendente. Todos foram marcados como pedido feito.
        </p>
      ) : (
      <div className="space-y-3">
        {paginated.map((a) => {
          const loading = markingId === a.recommendation_id
          return (
            <div
              key={a.recommendation_id}
              className={`flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border-l-4 transition-colors ${
                a.priority === 'high'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-400'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 dark:border-yellow-400'
              }`}
            >
              <Link
                href={`/dashboard/analysis/${a.analysis_id}`}
                className={`flex-1 min-w-0 block py-1 pr-2 ${
                  a.priority === 'high'
                    ? 'hover:bg-red-100/50 dark:hover:bg-red-900/30'
                    : 'hover:bg-yellow-100/50 dark:hover:bg-yellow-900/30'
                } rounded transition-colors`}
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {a.product_name}
                </p>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 font-semibold">
                  📦 Pedir {a.recommended_quantity} un até {a.dateLabel}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  MOQ: {a.moq} un • Lead time: {a.leadTime} dias
                </p>
              </Link>
              <div
                className="shrink-0 flex items-center"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <button
                    type="button"
                    disabled={loading}
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setMarkError(null)
                      setMarkingId(a.recommendation_id)
                      try {
                        const res = await fetch('/api/alert-actions', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            product_id: a.product_id,
                            recommendation_id: a.recommendation_id
                          }),
                          credentials: 'same-origin'
                        })
                        const data = await res.json().catch(() => ({}))
                        if (res.ok) {
                          toast.success('Pedido marcado como feito!')
                          setJustMarked((s) => new Set(s).add(a.recommendation_id))
                          router.refresh()
                        } else {
                          const msg = typeof data?.error === 'string' ? data.error : 'Não foi possível marcar. Tente novamente.'
                          setMarkError(msg)
                          console.error('[Alertas] POST /api/alert-actions', res.status, data)
                        }
                      } catch (err) {
                        setMarkError('Erro de conexão. Tente novamente.')
                        console.error('[Alertas] POST /api/alert-actions', err)
                      } finally {
                        setMarkingId(null)
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : null}
                    Marcar como pedido feito
                  </button>
              </div>
            </div>
          )
        })}
      </div>
      )}
      {total > 0 && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-600 pt-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            <ChevronLeft className="size-4" /> Anterior
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Página {safePage} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            Próxima <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
