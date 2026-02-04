/**
 * Script de diagnóstico dos dados no Supabase.
 * Carrega .env.local do projeto e consulta análises, produtos, vendas e previsões.
 *
 * Como rodar (na raiz do projeto):
 *   npx tsx scripts/diagnose-data.ts
 *
 * Requer: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Carregar .env.local da raiz do projeto
function loadEnvLocal() {
  const root = resolve(process.cwd(), '.env.local')
  if (!existsSync(root)) return
  const content = readFileSync(root, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=')
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim()
        const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
        if (!process.env[key]) process.env[key] = value
      }
    }
  }
}

loadEnvLocal()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    '❌ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local'
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnoseData() {
  console.log('🔍 Diagnóstico dos Dados\n')

  // 1. Últimas análises (schema usa file_name, não name)
  const { data: analyses, error: analysesError } = await supabase
    .from('analyses')
    .select('id, file_name, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (analysesError) {
    console.error('❌ Erro ao buscar análises:', analysesError.message)
    return
  }

  console.log('📊 Últimas 5 análises:')
  console.table(
    (analyses || []).map((a) => ({
      id: a.id?.slice(0, 8) + '…',
      file_name: a.file_name,
      status: a.status,
      created_at: a.created_at,
    }))
  )

  if (!analyses || analyses.length === 0) {
    console.log('❌ Nenhuma análise encontrada')
    return
  }

  const latestAnalysisId = analyses[0].id
  const latestName = analyses[0].file_name ?? '(sem nome)'
  console.log(`\n🎯 Analisando: ${latestName} (ID: ${latestAnalysisId})\n`)

  // 2. Produtos dessa análise (schema: original_name, cleaned_name; não tem sku/name)
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, original_name, cleaned_name, price')
    .eq('analysis_id', latestAnalysisId)

  if (productsError) {
    console.error('❌ Erro ao buscar produtos:', productsError.message)
    return
  }

  console.log(`📦 ${products?.length ?? 0} produto(s) encontrado(s):`)
  console.table(
    (products || []).map((p) => ({
      id: p.id?.slice(0, 8) + '…',
      original_name: (p.original_name ?? '').slice(0, 40),
      cleaned_name: (p.cleaned_name ?? '').slice(0, 40),
      price: p.price,
    }))
  )

  const productIds = (products || []).map((p) => p.id).filter(Boolean)
  if (productIds.length === 0) {
    console.log('\n⚠️ Nenhum produto nesta análise; não há sales_history/forecasts por análise.')
    return
  }

  // 3. Sales history (ligada a product_id; schema: date, quantity, revenue)
  const { data: sales, error: salesError } = await supabase
    .from('sales_history')
    .select('date, product_id, quantity, revenue')
    .in('product_id', productIds)
    .order('date', { ascending: true })
    .limit(10)

  if (salesError) {
    console.error('❌ Erro ao buscar vendas:', salesError.message)
  } else {
    console.log(`\n📈 Primeiras 10 vendas (desta análise):`)
    console.table(
      (sales || []).map((s) => ({
        date: s.date,
        product_id: s.product_id?.slice(0, 8) + '…',
        quantity: s.quantity,
        revenue: s.revenue,
      }))
    )
  }

  // 4. Total de linhas de vendas
  const { count: salesCount } = await supabase
    .from('sales_history')
    .select('*', { count: 'exact', head: true })
    .in('product_id', productIds)

  console.log(`\n📊 Total de linhas em sales_history (esta análise): ${salesCount ?? 0}`)

  // 5. Range de datas
  const { data: dateRange } = await supabase
    .from('sales_history')
    .select('date')
    .in('product_id', productIds)
    .order('date', { ascending: true })

  if (dateRange && dateRange.length > 0) {
    const dates = dateRange.map((d) => d.date).filter(Boolean) as string[]
    const first = dates[0]
    const last = dates[dates.length - 1]
    const uniqueDays = new Set(dates).size
    console.log(`\n📅 Range de datas:`)
    console.log(`   Primeira: ${first}`)
    console.log(`   Última: ${last}`)
    console.log(`   Dias únicos com vendas: ${uniqueDays}`)
  }

  // 6. Forecasts (ligada a product_id; schema: forecast_date, predicted_quantity)
  const { data: forecasts, error: forecastsError } = await supabase
    .from('forecasts')
    .select('forecast_date, predicted_quantity, lower_bound, upper_bound')
    .in('product_id', productIds)
    .order('forecast_date', { ascending: true })
    .limit(10)

  if (forecastsError) {
    console.error('❌ Erro ao buscar previsões:', forecastsError.message)
  } else {
    console.log(`\n🔮 Primeiras 10 previsões:`)
    console.table(
      (forecasts || []).map((f) => ({
        forecast_date: f.forecast_date,
        predicted_quantity: f.predicted_quantity,
        lower_bound: f.lower_bound,
        upper_bound: f.upper_bound,
      }))
    )
  }

  // 7. Checar se valores são todos iguais (previsão plana)
  if (forecasts && forecasts.length > 1) {
    const values = forecasts
      .map((f) => Number(f.predicted_quantity))
      .filter((n) => !Number.isNaN(n))
    const firstValue = values[0]
    const allSame = values.length > 0 && values.every((v) => v === firstValue)

    if (allSame) {
      console.log(
        `\n⚠️  PROBLEMA: Todas as previsões têm o mesmo valor (${firstValue})`
      )
      console.log('   Isso pode indicar que Prophet não está variando por produto/data.')
    } else if (values.length > 0) {
      console.log(
        `\n✅ Previsões variam (min: ${Math.min(...values)}, max: ${Math.max(...values)})`
      )
    }
  }
}

diagnoseData().catch((err) => {
  console.error(err)
  process.exit(1)
})
