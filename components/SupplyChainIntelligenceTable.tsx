'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Truck, Clock, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react'
import type { ProdutoEmRisco } from '@/lib/dashboard-data'

const TABLE_PAGE_SIZE = 15

function qPillClasses(risk: ProdutoEmRisco['risk_level'], urgency: ProdutoEmRisco['urgency']) {
  const isHigh = risk === 'high' || urgency === 'high' || urgency === 'critical'
  const isMedium = risk === 'medium' || urgency === 'medium'
  if (isHigh) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  if (isMedium) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
  return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
}

function qLabel(risk: ProdutoEmRisco['risk_level'], urgency: ProdutoEmRisco['urgency']) {
  const isHigh = risk === 'high' || urgency === 'high' || urgency === 'critical'
  const isMedium = risk === 'medium' || urgency === 'medium'
  if (isHigh) return 'Alto'
  if (isMedium) return 'Médio'
  return 'Baixo'
}

export interface SupplyChainIntelligenceTableProps {
  items: ProdutoEmRisco[]
  defaultLeadTimeDays: number | null
  defaultMoq: number | null
  markedRecommendationIds?: string[]
}

export function SupplyChainIntelligenceTable({
  items,
  defaultLeadTimeDays,
  defaultMoq,
  markedRecommendationIds = []
}: SupplyChainIntelligenceTableProps) {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [markError, setMarkError] = useState<string | null>(null)
  const [justMarked, setJustMarked] = useState<Set<string>>(() => new Set())
  const markedSet = useMemo(() => new Set(markedRecommendationIds), [markedRecommendationIds])
  const isMarked = (recId: string) => markedSet.has(recId) || justMarked.has(recId)
  const filtered = useMemo(
    () => items.filter((i) => !isMarked(i.recommendation_id)),
    [items, markedSet, justMarked]
  )
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * TABLE_PAGE_SIZE
  const end = Math.min(start + TABLE_PAGE_SIZE, total)
  const paginated = useMemo(
    () => filtered.slice(start, end),
    [filtered, start, end]
  )

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(1)
  }, [totalPages, page])

  if (items.length === 0) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Truck className="size-5 text-blue-500 dark:text-blue-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Supply Chain Intelligence
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Lead time, MOQ e recomendações acionáveis
            </p>
          </div>
        </div>
        {total > TABLE_PAGE_SIZE && (
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
          Nenhum item pendente. Todos foram marcados como pedido feito.
        </p>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-600">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Produto
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Fornecedor
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Lead Time
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                MOQ
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Estoque
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Recomendação
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item) => {
              const qClasses = qPillClasses(item.risk_level, item.urgency)
              const qLabelText = qLabel(item.risk_level, item.urgency)
              const effectiveLead = item.supplier_lead_time_days ?? defaultLeadTimeDays
              const effectiveMoq = item.supplier_moq ?? defaultMoq
              const leadTime = effectiveLead != null ? `${effectiveLead}d` : '—'
              const moqStr = effectiveMoq != null ? `${effectiveMoq} un` : '—'
              const orderQty = item.recommended_quantity ?? effectiveMoq
              const showOrder = orderQty != null && orderQty > 0
              const moqForNote = effectiveMoq ?? orderQty

              return (
                <tr
                  key={item.product_id}
                  className="border-b last:border-b-0 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.product_name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${qClasses}`}
                        title={`Risco: ${qLabelText}`}
                      >
                        Q: {qLabelText}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {item.supplier_name ?? '—'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Clock className="size-3 text-gray-400 dark:text-gray-500" />
                      <span className="text-sm text-gray-900 dark:text-white">{leadTime}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{moqStr}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {item.current_stock != null ? item.current_stock.toLocaleString('pt-BR') : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      {showOrder ? (
                        <div className="text-xs">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            Pedir {orderQty} un HOJE
                          </span>
                          {moqForNote != null && (
                            <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                              (MOQ {moqForNote} + buffer)
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {item.reasoning || 'Recomendação de reposição.'}
                        </p>
                      )}
                      <Link
                        href={`/dashboard/analysis/${item.analysis_id}`}
                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Ver análise →
                      </Link>
                      <button
                        type="button"
                        disabled={markingId === item.recommendation_id}
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setMarkError(null)
                          setMarkingId(item.recommendation_id)
                          try {
                            const res = await fetch('/api/alert-actions', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                product_id: item.product_id,
                                recommendation_id: item.recommendation_id
                              }),
                              credentials: 'same-origin'
                            })
                              const data = await res.json().catch(() => ({}))
                              if (res.ok) {
                                toast.success('Pedido marcado como feito!')
                                setJustMarked((s) => new Set(s).add(item.recommendation_id))
                                router.refresh()
                              } else {
                              const msg = typeof data?.error === 'string' ? data.error : 'Não foi possível marcar. Tente novamente.'
                              setMarkError(msg)
                              console.error('[SupplyChain] POST /api/alert-actions', res.status, data)
                            }
                          } catch (err) {
                            setMarkError('Erro de conexão. Tente novamente.')
                            console.error('[SupplyChain] POST /api/alert-actions', err)
                          } finally {
                            setMarkingId(null)
                          }
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mt-0.5 disabled:opacity-50"
                      >
                        {markingId === item.recommendation_id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : null}
                        Marcar como pedido feito
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
