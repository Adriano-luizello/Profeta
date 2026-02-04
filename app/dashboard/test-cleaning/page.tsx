'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Analysis {
  id: string
  file_name: string
  status: string
  total_products: number
  created_at: string
}

export default function TestCleaningPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalyses()
  }, [])

  const fetchAnalyses = async () => {
    try {
      const response = await fetch('/api/analyses')
      const data = await response.json()
      setAnalyses(data.analyses || [])
    } catch (err) {
      console.error('Erro ao buscar análises:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClean = async (analysisId: string) => {
    setProcessing(analysisId)
    setError(null)
    setResults(null)

    try {
      console.log('Iniciando limpeza para análise:', analysisId)
      
      const response = await fetch(`/api/analyses/${analysisId}/clean`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao limpar dados')
      }

      const data = await response.json()
      console.log('Resultado:', data)
      
      setResults(data)
      
      // Atualizar lista de análises
      await fetchAnalyses()

    } catch (err) {
      console.error('Erro:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent cursor-pointer">
              Profeta
            </h1>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ← Voltar ao Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🧪 Teste de Limpeza de Dados
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Clique em "Limpar com IA" para processar os dados com GPT-4
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600 dark:text-gray-400">Carregando análises...</p>
          </div>
        ) : analyses.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Nenhuma análise encontrada
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Você precisa fazer upload de um CSV primeiro
            </p>
            <Link
              href="/dashboard/upload"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              📤 Fazer Upload de CSV
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {analyses.map((analysis) => (
              <div
                key={analysis.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {analysis.file_name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>📊 {analysis.total_products} produtos</span>
                      <span>📅 {new Date(analysis.created_at).toLocaleDateString('pt-BR')}</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          analysis.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : analysis.status === 'cleaning'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                        }`}
                      >
                        {analysis.status}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleClean(analysis.id)}
                  disabled={processing === analysis.id || analysis.status === 'cleaning'}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-lg transition-all disabled:cursor-not-allowed"
                >
                  {processing === analysis.id
                    ? '⏳ Processando... (pode levar 30s)'
                    : analysis.status === 'cleaning'
                    ? '🔄 Já está sendo processado'
                    : '🧹 Limpar com IA (GPT-4)'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 className="text-red-800 dark:text-red-200 font-semibold mb-2">❌ Erro</h4>
            <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <h4 className="text-green-800 dark:text-green-200 font-semibold text-lg mb-4">
              ✅ Limpeza Concluída!
            </h4>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {results.stats.valid}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Produtos Processados
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {Math.round(results.stats.average_data_quality)}/100
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Qualidade Média
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {(results.stats.average_confidence * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Confiança da IA
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  ${results.stats.total_cost_usd.toFixed(4)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Custo Total
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                📊 Estatísticas Detalhadas:
              </h5>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <div>• Alta qualidade (≥80): {results.stats.high_quality} produtos</div>
                <div>• Média qualidade (50-79): {results.stats.medium_quality} produtos</div>
                <div>• Baixa qualidade (&lt;50): {results.stats.low_quality} produtos</div>
                <div>• Anomalias encontradas: {results.stats.anomalies_found}</div>
                <div>• Anomalias críticas: {results.stats.critical_anomalies}</div>
                <div>• Tempo de processamento: {(results.stats.processing_time_ms / 1000).toFixed(1)}s</div>
              </div>
            </div>

            <div className="mt-4">
              <Link
                href="/dashboard"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                ✅ Ver no Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
