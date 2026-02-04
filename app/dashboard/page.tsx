import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Upload, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getLatestAnalysisWithDetails } from '@/lib/dashboard-data'
import { getForecastFromDb } from '@/lib/services/run-forecast'
import { DashboardAnalysisView } from '@/components/dashboard/analysis/DashboardAnalysisView'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const analysis = await getLatestAnalysisWithDetails(supabase, user.id)

  if (!analysis) {
    return (
      <div className="p-6 md:p-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Dashboard
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Vendas e projeções da sua loja. Envie dados em Upload para começar.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/upload" className="inline-flex items-center gap-2">
              <Upload className="size-4" />
              Upload de dados
            </Link>
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Ainda não há análise. Faça upload de um CSV para começar.
          </p>
          <Link
            href="/dashboard/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Fazer upload
          </Link>
        </div>
      </div>
    )
  }

  const [productsResult, forecast] = await Promise.all([
    supabase
      .from('products')
      .select('id, original_name, cleaned_name, refined_category, sku')
      .eq('analysis_id', analysis.id)
      .order('created_at', { ascending: true }),
    getForecastFromDb(supabase, analysis.id),
  ])

  const products = (productsResult.data ?? []) as {
    id: string
    original_name: string
    cleaned_name: string | null
    refined_category: string | null
    sku: string | null
  }[]

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Vendas e projeções da sua loja. Dados da análise mais recente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/${analysis.id}`} className="inline-flex items-center gap-2">
              <BarChart3 className="size-4" />
              Projeções (Model Router)
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/upload" className="inline-flex items-center gap-2">
              <Upload className="size-4" />
              Upload de dados
            </Link>
          </Button>
        </div>
      </div>

      <DashboardAnalysisView
        analysis={{
          id: analysis.id,
          file_name: analysis.file_name,
          total_products: analysis.total_products,
          created_at: analysis.created_at,
        }}
        products={products}
        forecast={forecast}
        analysisId={analysis.id}
      />
    </div>
  )
}
