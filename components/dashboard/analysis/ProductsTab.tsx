'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Grid3x3, List, Filter } from 'lucide-react'
import { ProductCard } from './ProductCard'
import { ProductDetailDialog } from './ProductDetailDialog'
import type { ForecastResponse, ProductForecast } from '@/types/forecasting'

interface ProductsTabProps {
  forecast: ForecastResponse | null
  /** Produtos do DB (quando ainda não há forecast) para listar na grid */
  productsFromDb?: { id: string; name: string; category: string; sku?: string }[]
  /** Mapa product_id -> sku para exibir SKU nos cards e no modal */
  productIdToSku?: Record<string, string>
  /** Período selecionado (30/60/90) para exibir previsão */
  selectedPeriod?: 30 | 60 | 90
}

export function ProductsTab({
  forecast,
  productsFromDb = [],
  productIdToSku = {},
  selectedPeriod = 30,
}: ProductsTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [groupBy, setGroupBy] = useState<'none' | 'category'>('none')
  const [selectedProduct, setSelectedProduct] = useState<ProductForecast | null>(null)
  const selectedSku = selectedProduct ? productIdToSku[selectedProduct.product_id] : undefined

  const productForecasts = forecast?.product_forecasts ?? []
  const hasForecast = productForecasts.length > 0

  const filteredProducts = useMemo(() => {
    if (hasForecast) {
      return productForecasts.filter((p) =>
        p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return productsFromDb.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [hasForecast, productForecasts, productsFromDb, searchQuery])

  const groupedProducts = useMemo(() => {
    if (groupBy === 'none') {
      return { Todos: filteredProducts }
    }
    if (hasForecast) {
      return (filteredProducts as ProductForecast[]).reduce(
        (acc: Record<string, ProductForecast[]>, product: ProductForecast) => {
          const category = product.category || 'Sem Categoria'
          if (!acc[category]) acc[category] = []
          acc[category].push(product)
          return acc
        },
        {}
      )
    }
    return (filteredProducts as { id: string; name: string; category: string }[]).reduce(
      (acc: Record<string, { id: string; name: string; category: string }[]>, product) => {
        const category = product.category || 'Sem Categoria'
        if (!acc[category]) acc[category] = []
        acc[category].push(product)
        return acc
      },
      {}
    )
  }, [filteredProducts, groupBy, hasForecast])

  if (!hasForecast && productsFromDb.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <p>Gere o forecast para ver produtos aqui, ou faça upload de um CSV com produtos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>

        <Select value={groupBy} onValueChange={(v: 'none' | 'category') => setGroupBy(v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem Agrupamento</SelectItem>
            <SelectItem value="category">Agrupar por Categoria</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex border rounded-md">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="rounded-r-none"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {Object.entries(groupedProducts).map(([category, products]) => (
        <div key={category}>
          {groupBy !== 'none' && (
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🏷️ {category}
              <span className="text-sm text-muted-foreground font-normal">
                ({(products as unknown[]).length} produtos)
              </span>
            </h3>
          )}

          {hasForecast ? (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'space-y-2'
              }
            >
              {(products as ProductForecast[]).map((product) => (
                <ProductCard
                  key={product.product_id}
                  product={product}
                  viewMode={viewMode}
                  sku={productIdToSku[product.product_id]}
                  onClick={() => setSelectedProduct(product)}
                  selectedPeriod={selectedPeriod}
                />
              ))}
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'space-y-2'
              }
            >
              {(products as { id: string; name: string; category: string }[]).map((product) => (
                <div
                  key={product.id}
                  className={`rounded-lg border bg-card p-4 ${
                    viewMode === 'grid' ? '' : 'flex justify-between items-center'
                  }`}
                >
                  <p className="font-medium truncate" title={product.name}>
                    {product.name}
                  </p>
                  <p className="text-sm text-muted-foreground">{product.category}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gere o forecast para ver previsões
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {selectedProduct && (
        <ProductDetailDialog
          product={selectedProduct}
          sku={selectedSku}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  )
}
