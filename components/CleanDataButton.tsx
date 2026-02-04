'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CleanDataButtonProps {
  analysisId: string
}

export function CleanDataButton({ analysisId }: CleanDataButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleClick = async () => {
    if (isLoading) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/analyses/${analysisId}/clean`, {
        method: 'POST',
      })

      if (response.ok) {
        // Redirecionar para a página de detalhes após processar
        router.push(`/dashboard/analysis/${analysisId}`)
        router.refresh()
      } else {
        alert('Erro ao processar dados. Tente novamente.')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao processar dados. Tente novamente.')
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all"
    >
      {isLoading ? (
        <>
          <span className="inline-block animate-spin mr-2">⚙️</span>
          Processando...
        </>
      ) : (
        '🧹 Limpar com IA'
      )}
    </button>
  )
}
