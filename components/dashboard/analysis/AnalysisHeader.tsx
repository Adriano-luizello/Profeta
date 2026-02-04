'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AnalysisHeaderProps {
  fileName: string
  createdAt: string
  totalProducts: number
  /** No dashboard principal não faz sentido mostrar "Voltar ao Dashboard". Default true (mostra no detalhe da análise). */
  showBackLink?: boolean
}

export function AnalysisHeader({
  fileName,
  createdAt,
  totalProducts,
  showBackLink = true,
}: AnalysisHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      {showBackLink && (
        <Link
          href="/dashboard"
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 inline-flex"
        >
          ← Voltar ao Dashboard
        </Link>
      )}
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
        {fileName}
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Criado em{' '}
        {format(new Date(createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        {' · '}
        {totalProducts} produtos
      </p>
    </div>
  )
}
