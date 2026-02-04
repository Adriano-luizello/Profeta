'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Analysis {
  id: string
  file_name: string
  total_products: number
  processed_products: number | null
  status: string
  created_at: string
}

const statusLabel: Record<string, string> = {
  uploading: 'Enviando',
  validating: 'Validando',
  cleaning: 'Limpando dados',
  forecasting: 'Gerando previsão',
  recommending: 'Recomendando',
  completed: 'Concluído',
  failed: 'Falhou'
}

export function AnalysesListReadOnly() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/analyses')
      .then((r) => r.ok ? r.json() : { analyses: [] })
      .then((data) => {
        if (!cancelled && Array.isArray(data.analyses)) setAnalyses(data.analyses)
      })
      .catch(() => { if (!cancelled) setAnalyses([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Arquivos enviados
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando…</p>
      </div>
    )
  }

  if (analyses.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Arquivos enviados
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nenhum arquivo enviado ainda. Faça upload acima para começar.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Arquivos enviados
      </h3>
      <ul className="space-y-3">
        {analyses.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {a.file_name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {a.total_products} produtos · {new Date(a.created_at).toLocaleDateString('pt-BR')}
                {a.processed_products != null && ` · ${a.processed_products} limpos`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  a.status === 'completed'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                    : a.status === 'failed'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {statusLabel[a.status] ?? a.status}
              </span>
              <Link
                href={`/dashboard/analysis/${a.id}`}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Ver detalhes
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
