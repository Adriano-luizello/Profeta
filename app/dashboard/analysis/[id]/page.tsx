import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalysisPageClient } from '@/components/dashboard/analysis/AnalysisPageClient'

interface Product {
  id: string
  original_name: string
  cleaned_name: string | null
  refined_category: string | null
  sku: string | null
}

interface Analysis {
  id: string
  file_name: string
  total_products: number
  created_at: string
}

export default async function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const resolvedParams = await params
  const { data: analysis, error: analysisError } = await supabase
    .from('analyses')
    .select('id, file_name, total_products, created_at')
    .eq('id', resolvedParams.id)
    .eq('user_id', user.id)
    .single()

  if (analysisError || !analysis) {
    redirect('/dashboard')
  }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, original_name, cleaned_name, refined_category, sku')
    .eq('analysis_id', resolvedParams.id)
    .order('created_at', { ascending: true })

  if (productsError) {
    console.error('Error fetching products:', productsError)
  }

  const typedAnalysis = analysis as Analysis
  const typedProducts = (products || []) as Product[]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AnalysisPageClient
            analysis={{
              id: typedAnalysis.id,
              file_name: typedAnalysis.file_name,
              total_products: typedAnalysis.total_products,
              created_at: typedAnalysis.created_at,
            }}
            products={typedProducts}
            analysisId={resolvedParams.id}
          />
        </div>
      </div>
    </div>
  )
}
