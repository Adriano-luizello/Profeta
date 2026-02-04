import Link from 'next/link'
import { SuppliersSettings } from '@/components/SuppliersSettings'
import { ClearDataButton } from '@/components/ClearDataButton'

export default function SettingsPage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Configurações
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Supply chain,{' '}
          <Link href="/dashboard/settings#fornecedores" className="text-blue-600 dark:text-blue-400 hover:underline">
            fornecedores
          </Link>{' '}
          e preferências. Adicione, edite ou remova fornecedores abaixo.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <SuppliersSettings />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Dados
        </h2>
        <ClearDataButton />
      </div>
    </div>
  )
}
