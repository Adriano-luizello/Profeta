'use client'

import Link from 'next/link'

export default function OnboardingStep3Page() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="max-w-lg w-full mx-auto">
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent cursor-pointer">
              Profeta
            </h1>
          </Link>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Onboarding • Passo 3 de 3</p>
          <div className="flex justify-center gap-2 mt-4">
            <span className="w-8 h-1.5 rounded-full bg-blue-600" />
            <span className="w-8 h-1.5 rounded-full bg-blue-600" />
            <span className="w-8 h-1.5 rounded-full bg-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Envie seus dados
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Faça upload do histórico de vendas em CSV para começar as previsões.
          </p>
          <Link
            href="/dashboard/upload"
            className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors text-center"
          >
            Ir para Upload
          </Link>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Ou{' '}
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              acessar o dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
