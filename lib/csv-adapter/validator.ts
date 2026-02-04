import type { TransformedRow } from './transformer'

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  stats: ValidationStats
}

export interface ValidationError {
  row: number
  field: string
  value: any
  message: string
  severity: 'error'
}

export interface ValidationWarning {
  message: string
  count: number
  severity: 'warning'
  type: 'price_zero' | 'low_data' | 'product_low_data' | 'high_values' | 'date_range'
}

export interface ValidationStats {
  totalRows: number
  validRows: number
  invalidRows: number
  uniqueProducts: number
  dateRange: {
    min: Date
    max: Date
    days: number
  }
  averages: {
    quantity: number
    price: number
  }
}

function calculateDateRange(dates: Date[]): {
  min: Date
  max: Date
  days: number
} {
  if (dates.length === 0) {
    const now = new Date()
    return { min: now, max: now, days: 0 }
  }

  const timestamps = dates.map((d) => d.getTime())
  const minTime = Math.min(...timestamps)
  const maxTime = Math.max(...timestamps)

  const min = new Date(minTime)
  const max = new Date(maxTime)
  const days = Math.floor((maxTime - minTime) / (1000 * 60 * 60 * 24)) + 1

  return { min, max, days }
}

function generateWarnings(
  data: TransformedRow[],
  stats: ValidationStats,
  warnings: ValidationWarning[]
): void {
  const priceZeroCount = data.filter((r) => r.price === 0).length
  if (priceZeroCount > 0) {
    warnings.push({
      message: `${priceZeroCount} produto(s) têm preço zero. Isso pode afetar análises de faturamento.`,
      count: priceZeroCount,
      severity: 'warning',
      type: 'price_zero',
    })
  }

  const MIN_DAYS = 90
  if (stats.dateRange.days < MIN_DAYS) {
    warnings.push({
      message: `Apenas ${stats.dateRange.days} dia(s) de histórico. Recomenda-se no mínimo ${MIN_DAYS} dias para previsões mais precisas.`,
      count: 1,
      severity: 'warning',
      type: 'date_range',
    })
  }

  const productCounts = new Map<string, number>()
  data.forEach((row) => {
    productCounts.set(row.product, (productCounts.get(row.product) || 0) + 1)
  })

  const MIN_PRODUCT_DATA = 30
  const lowDataProducts = Array.from(productCounts.entries()).filter(
    ([, count]) => count < MIN_PRODUCT_DATA
  ).length

  if (lowDataProducts > 0) {
    warnings.push({
      message: `${lowDataProducts} produto(s) têm menos de ${MIN_PRODUCT_DATA} pontos de dados. Previsões podem ser menos precisas para esses produtos.`,
      count: lowDataProducts,
      severity: 'warning',
      type: 'product_low_data',
    })
  }

  if (stats.averages.quantity > 0) {
    const threshold = stats.averages.quantity * 10
    const highQuantityCount = data.filter((r) => r.quantity > threshold).length

    if (highQuantityCount > 0) {
      warnings.push({
        message: `${highQuantityCount} linha(s) têm quantidades muito altas (>10x a média: ${stats.averages.quantity.toFixed(1)}). Verifique se não há erro de digitação.`,
        count: highQuantityCount,
        severity: 'warning',
        type: 'high_values',
      })
    }
  }

  if (stats.averages.price > 0) {
    const threshold = stats.averages.price * 10
    const highPriceCount = data.filter((r) => r.price > threshold).length

    if (highPriceCount > 0) {
      warnings.push({
        message: `${highPriceCount} linha(s) têm preços muito altos (>10x a média: R$ ${stats.averages.price.toFixed(2)}). Verifique se não há erro de digitação.`,
        count: highPriceCount,
        severity: 'warning',
        type: 'high_values',
      })
    }
  }

  if (stats.uniqueProducts < 3) {
    warnings.push({
      message: `Apenas ${stats.uniqueProducts} produto(s) único(s) encontrado(s). Recomenda-se ter dados de múltiplos produtos para análises mais completas.`,
      count: stats.uniqueProducts,
      severity: 'warning',
      type: 'low_data',
    })
  }
}

export function validateTransformedData(
  data: TransformedRow[]
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (!data || data.length === 0) {
    return {
      valid: false,
      errors: [
        {
          row: 0,
          field: 'data',
          value: null,
          message: 'Nenhum dado válido encontrado',
          severity: 'error',
        },
      ],
      warnings: [],
      stats: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        uniqueProducts: 0,
        dateRange: {
          min: new Date(),
          max: new Date(),
          days: 0,
        },
        averages: {
          quantity: 0,
          price: 0,
        },
      },
    }
  }

  const products = new Set<string>()
  const dates: Date[] = []
  let totalQuantity = 0
  let totalPrice = 0
  let validRows = 0

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const rowNumber = i + 1
    let rowValid = true

    if (!(row.date instanceof Date) || isNaN(row.date.getTime())) {
      errors.push({
        row: rowNumber,
        field: 'date',
        value: row.date,
        message: 'Data inválida',
        severity: 'error',
      })
      rowValid = false
    } else {
      dates.push(row.date)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(23, 59, 59, 999)

      if (row.date > tomorrow) {
        errors.push({
          row: rowNumber,
          field: 'date',
          value: row.date.toLocaleDateString('pt-BR'),
          message: 'Data não pode ser futura',
          severity: 'error',
        })
        rowValid = false
      }
    }

    if (!row.product || row.product.length === 0) {
      errors.push({
        row: rowNumber,
        field: 'product',
        value: row.product,
        message: 'Nome do produto ausente',
        severity: 'error',
      })
      rowValid = false
    } else {
      products.add(row.product)
    }

    if (typeof row.quantity !== 'number' || isNaN(row.quantity)) {
      errors.push({
        row: rowNumber,
        field: 'quantity',
        value: row.quantity,
        message: 'Quantidade deve ser um número',
        severity: 'error',
      })
      rowValid = false
    } else if (row.quantity <= 0) {
      errors.push({
        row: rowNumber,
        field: 'quantity',
        value: row.quantity,
        message: 'Quantidade deve ser maior que zero',
        severity: 'error',
      })
      rowValid = false
    } else {
      totalQuantity += row.quantity
    }

    if (typeof row.price !== 'number' || isNaN(row.price)) {
      errors.push({
        row: rowNumber,
        field: 'price',
        value: row.price,
        message: 'Preço deve ser um número',
        severity: 'error',
      })
      rowValid = false
    } else if (row.price < 0) {
      errors.push({
        row: rowNumber,
        field: 'price',
        value: row.price,
        message: 'Preço não pode ser negativo',
        severity: 'error',
      })
      rowValid = false
    } else {
      totalPrice += row.price
    }

    if (rowValid) {
      validRows++
    }
  }

  const stats: ValidationStats = {
    totalRows: data.length,
    validRows,
    invalidRows: data.length - validRows,
    uniqueProducts: products.size,
    dateRange: calculateDateRange(dates),
    averages: {
      quantity: validRows > 0 ? totalQuantity / validRows : 0,
      price: validRows > 0 ? totalPrice / validRows : 0,
    },
  }

  generateWarnings(data, stats, warnings)

  return {
    valid: errors.length === 0 && validRows > 0,
    errors,
    warnings,
    stats,
  }
}
