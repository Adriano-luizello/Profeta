'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Info, CheckCircle2 } from 'lucide-react'

export interface ColumnMapping {
  date: string
  product: string
  quantity: string
  price: string
  category?: string
  /** SKU ou código único (ex: coluna "Sku"). Opcional; usado para agrupar linhas. */
  sku?: string
  supplier?: string
  stock?: string
}

interface ColumnMapperProps {
  sourceHeaders: string[]
  data: any[]
  onMappingComplete: (mapping: ColumnMapping) => void
  onBack?: () => void
}

function getFieldDescription(field: keyof ColumnMapping): string {
  const descriptions: Record<keyof ColumnMapping, string> = {
    date: 'Data da venda (formato: DD/MM/YYYY, YYYY-MM-DD ou MM/DD/YYYY)',
    product: 'Nome descritivo do produto (ex: coluna "Product name")',
    quantity: 'Quantidade vendida (número inteiro positivo)',
    price: 'Preço unitário (número com ou sem decimais)',
    category: 'Categoria do produto',
    sku: 'SKU ou código único (ex: coluna "Sku"). Opcional; usado para agrupar linhas.',
    supplier: 'Nome do fornecedor',
    stock: 'Estoque atual disponível',
  }
  return descriptions[field]
}

function getFieldLabel(field: keyof ColumnMapping): string {
  const labels: Record<keyof ColumnMapping, string> = {
    date: 'Data',
    product: 'Nome do produto',
    quantity: 'Quantidade',
    price: 'Preço',
    category: 'Categoria',
    sku: 'SKU',
    supplier: 'Fornecedor',
    stock: 'Estoque',
  }
  return labels[field]
}

export function ColumnMapper({
  sourceHeaders,
  data,
  onMappingComplete,
  onBack,
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({})

  const requiredFields: Array<keyof ColumnMapping> = [
    'date',
    'product',
    'quantity',
    'price',
  ]

  const optionalFields: Array<keyof ColumnMapping> = [
    'category',
    'sku',
    'supplier',
    'stock',
  ]

  const isComplete = requiredFields.every(
    (field) => mapping[field] && mapping[field] !== ''
  )

  const missingCount = requiredFields.filter(
    (field) => !mapping[field] || mapping[field] === ''
  ).length

  const NONE_VALUE = '__none__'

  // Garantir TODAS as colunas: sourceHeaders + keys de todas as linhas do preview (evitar coluna faltando)
  const allHeaders = (() => {
    const fromSource = sourceHeaders.filter((h) => h != null && String(h).trim() !== '')
    const seen = new Set<string>()
    const out: string[] = []
    for (const h of fromSource) {
      const t = String(h).trim()
      if (t && !seen.has(t)) {
        seen.add(t)
        out.push(t)
      }
    }
    // Coletar keys das primeiras linhas (até 10) para não perder colunas que faltem na linha 0
    const rows = Array.isArray(data) ? data.slice(0, 10) : []
    for (const row of rows) {
      if (row && typeof row === 'object' && row !== null) {
        for (const k of Object.keys(row)) {
          const t = String(k ?? '').trim().replace(/^\ufeff/, '')
          if (t && !seen.has(t)) {
            seen.add(t)
            out.push(t)
          }
        }
      }
    }
    return out
  })()

  const previewValue = (header: string) => {
    const raw = data[0]?.[header]
    if (raw == null || raw === '') return '(vazio)'
    const str = String(raw).trim()
    return str.length > 20 ? `${str.substring(0, 20)}…` : str
  }

  const selectValue = (field: keyof ColumnMapping) => {
    const v = mapping[field]?.trim()
    return v ? v : NONE_VALUE
  }

  const handleSelectChange = (field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: value === NONE_VALUE ? '' : value,
    }))
  }

  const buildCompleteMapping = (): ColumnMapping => {
    const base: ColumnMapping = {
      date: mapping.date ?? '',
      product: mapping.product ?? '',
      quantity: mapping.quantity ?? '',
      price: mapping.price ?? '',
    }
    if (mapping.category?.trim()) base.category = mapping.category.trim()
    if (mapping.sku?.trim()) base.sku = mapping.sku.trim()
    if (mapping.supplier?.trim()) base.supplier = mapping.supplier.trim()
    if (mapping.stock?.trim()) base.stock = mapping.stock.trim()
    return base
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Mapeie as colunas do seu CSV para o formato esperado pela aplicação.
          Os campos marcados com <span className="text-red-500">*</span> são
          obrigatórios.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Preview (primeira linha do CSV)
          </h3>
          <div
            className="grid grid-cols-2 gap-3 text-sm bg-muted/50 dark:bg-muted/20 p-4 rounded-lg max-h-48 overflow-y-auto"
            role="region"
            aria-label="Preview da primeira linha do CSV"
          >
            {allHeaders.slice(0, 12).map((header, index) => (
              <div key={index} className="flex flex-col">
                <span className="font-medium text-foreground">{header}:</span>
                <span className="text-muted-foreground truncate">
                  {data[0]?.[header] != null && data[0]?.[header] !== ''
                    ? String(data[0][header]).trim()
                    : '(vazio)'}
                </span>
              </div>
            ))}
            {allHeaders.length > 12 && (
              <div className="col-span-2 text-muted-foreground text-center text-sm">
                ...e mais {allHeaders.length - 12} coluna(s)
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4 text-lg">Campos Obrigatórios</h3>
          <div className="space-y-5">
            {requiredFields.map((field) => (
              <div
                key={field}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start"
              >
                <div>
                  <label
                    htmlFor={`mapper-${field}`}
                    className="font-medium text-sm flex items-center gap-2"
                  >
                    {getFieldLabel(field)}
                    <span className="text-red-500" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <p
                    id={`mapper-${field}-desc`}
                    className="text-xs text-muted-foreground mt-1"
                  >
                    {getFieldDescription(field)}
                  </p>
                </div>

                <Select
                  value={selectValue(field)}
                  onValueChange={(value) => handleSelectChange(field, value)}
                >
                  <SelectTrigger
                    id={`mapper-${field}`}
                    aria-describedby={`mapper-${field}-desc`}
                    className={
                      mapping[field]?.trim()
                        ? 'border-green-500 dark:border-green-600'
                        : ''
                    }
                  >
                    <SelectValue placeholder="Selecione a coluna..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(70vh,400px)] overflow-y-auto">
                    <SelectItem value={NONE_VALUE}>
                      Nenhuma
                    </SelectItem>
                    {allHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        <div className="flex items-center justify-between w-full gap-3">
                          <span>{header}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {previewValue(header)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4 text-lg">Campos Opcionais</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Preencha se desejar incluir informações adicionais
          </p>
          <div className="space-y-5">
            {optionalFields.map((field) => (
              <div
                key={field}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start"
              >
                <div>
                  <label
                    htmlFor={`mapper-opt-${field}`}
                    className="font-medium text-sm"
                  >
                    {getFieldLabel(field)}
                  </label>
                  <p
                    id={`mapper-opt-${field}-desc`}
                    className="text-xs text-muted-foreground mt-1"
                  >
                    {getFieldDescription(field)}
                  </p>
                </div>

                <Select
                  value={selectValue(field)}
                  onValueChange={(value) => handleSelectChange(field, value)}
                >
                  <SelectTrigger
                    id={`mapper-opt-${field}`}
                    aria-describedby={`mapper-opt-${field}-desc`}
                  >
                    <SelectValue placeholder="(opcional)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(70vh,400px)] overflow-y-auto">
                    <SelectItem value={NONE_VALUE}>
                      Nenhuma
                    </SelectItem>
                    {allHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        <div className="flex items-center justify-between w-full gap-3">
                          <span>{header}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {previewValue(header)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 items-center">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            ← Voltar
          </Button>
        )}

        <Button
          onClick={() => onMappingComplete(buildCompleteMapping())}
          disabled={!isComplete}
          className="flex-1"
          size="lg"
          aria-disabled={!isComplete}
        >
          {isComplete ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Continuar
            </>
          ) : (
            <>
              Preencha {missingCount} campo
              {missingCount > 1 ? 's' : ''} obrigatório
              {missingCount > 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
