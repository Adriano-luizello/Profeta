'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const DEFAULTS = {
  default_lead_time_days: 30,
  default_moq: 100,
  stockout_warning_days: 14,
}

export default function OnboardingStep2Page() {
  const [leadTime, setLeadTime] = useState(String(DEFAULTS.default_lead_time_days))
  const [moq, setMoq] = useState(String(DEFAULTS.default_moq))
  const [stockoutDays, setStockoutDays] = useState(String(DEFAULTS.stockout_warning_days))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/step-2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_lead_time_days: parseInt(leadTime, 10) || DEFAULTS.default_lead_time_days,
          default_moq: parseInt(moq, 10) || DEFAULTS.default_moq,
          stockout_warning_days: parseInt(stockoutDays, 10) || DEFAULTS.stockout_warning_days,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
      router.push('/onboarding/step-3-upload')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="max-w-lg w-full mx-auto">
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent cursor-pointer">
              Profeta
            </h1>
          </Link>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Onboarding • Passo 2 de 3</p>
          <div className="flex justify-center gap-2 mt-4">
            <span className="w-8 h-1.5 rounded-full bg-blue-600" />
            <span className="w-8 h-1.5 rounded-full bg-blue-600" />
            <span className="w-8 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Supply chain
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Configure padrões de lead time, MOQ e alertas. Você pode alterar depois.
          </p>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="leadTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lead time padrão (dias)
              </label>
              <input
                id="leadTime"
                type="number"
                min={1}
                max={365}
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="moq" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                MOQ padrão (unidades)
              </label>
              <input
                id="moq"
                type="number"
                min={0}
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="stockoutDays" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Alerta de stockout (dias antes)
              </label>
              <input
                id="stockoutDays"
                type="number"
                min={1}
                max={90}
                value={stockoutDays}
                onChange={(e) => setStockoutDays(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Continuar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
