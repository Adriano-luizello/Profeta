import type { ColumnMapping } from '@/components/upload/column-mapper'

export interface TransformConfig {
  mapping: ColumnMapping
  dateFormat?: 'auto' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY'
  decimalSeparator?: '.' | ','
}

export interface TransformedRow {
  date: Date
  product: string
  quantity: number
  price: number
  category?: string
  sku?: string
  supplier?: string
  stock?: number
}

export interface TransformResult {
  data: TransformedRow[]
  errors: TransformError[]
  stats: {
    totalRows: number
    validRows: number
    invalidRows: number
    skippedRows: number
  }
}

export interface TransformError {
  row: number
  field: string
  value: any
  reason: string
}

function parseDate(value: any, format?: string): Date | null {
  if (value == null || value === '') return null

  const str = String(value).trim()
  if (str === '') return null

  const ddmmyyyyRegex = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/
  const matchDDMMYYYY = str.match(ddmmyyyyRegex)
  if (matchDDMMYYYY) {
    const [, day, month, year] = matchDDMMYYYY
    const date = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10)
    )
    if (
      date.getDate() === parseInt(day, 10) &&
      date.getMonth() === parseInt(month, 10) - 1 &&
      date.getFullYear() === parseInt(year, 10)
    ) {
      return date
    }
  }

  const yyyymmddRegex = /^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/
  const matchYYYYMMDD = str.match(yyyymmddRegex)
  if (matchYYYYMMDD) {
    const [, year, month, day] = matchYYYYMMDD
    const date = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10)
    )
    if (
      date.getDate() === parseInt(day, 10) &&
      date.getMonth() === parseInt(month, 10) - 1 &&
      date.getFullYear() === parseInt(year, 10)
    ) {
      return date
    }
  }

  if (format === 'MM/DD/YYYY') {
    const mmddyyyyRegex = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/
    const matchMMDDYYYY = str.match(mmddyyyyRegex)
    if (matchMMDDYYYY) {
      const [, month, day, year] = matchMMDDYYYY
      const date = new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10)
      )
      if (
        date.getDate() === parseInt(day, 10) &&
        date.getMonth() === parseInt(month, 10) - 1 &&
        date.getFullYear() === parseInt(year, 10)
      ) {
        return date
      }
    }
  }

  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }

  return null
}

function parseNumber(value: any, decimalSeparator: '.' | ',' = '.'): number {
  if (typeof value === 'number') {
    return value
  }

  let str = String(value).trim()
  str = str.replace(/\s/g, '')

  if (decimalSeparator === ',') {
    str = str.replace(/\./g, '')
    str = str.replace(',', '.')
  } else {
    str = str.replace(/,/g, '')
  }

  str = str.replace(/[^\d.-]/g, '')
  return parseFloat(str)
}

function applyMapping(
  sourceRow: any,
  config: TransformConfig,
  _rowNumber: number
): Partial<TransformedRow> {
  const transformed: Partial<TransformedRow> = {}
  const sep = config.decimalSeparator ?? '.'

  const dateValue = sourceRow[config.mapping.date]
  transformed.date = parseDate(dateValue, config.dateFormat) as Date | undefined
  if (!transformed.date) {
    throw {
      field: 'date',
      value: dateValue,
      message: 'Data inválida ou ausente',
    }
  }

  const productValue = sourceRow[config.mapping.product]
  transformed.product = String(productValue ?? '').trim()
  if (!transformed.product) {
    throw {
      field: 'product',
      value: productValue,
      message: 'Nome do produto ausente',
    }
  }

  const quantityValue = sourceRow[config.mapping.quantity]
  transformed.quantity = parseNumber(quantityValue, sep)
  if (isNaN(transformed.quantity) || transformed.quantity <= 0) {
    throw {
      field: 'quantity',
      value: quantityValue,
      message: 'Quantidade deve ser um número maior que zero',
    }
  }

  const priceValue = sourceRow[config.mapping.price]
  transformed.price = parseNumber(priceValue, sep)
  if (isNaN(transformed.price) || transformed.price < 0) {
    throw {
      field: 'price',
      value: priceValue,
      message: 'Preço deve ser um número maior ou igual a zero',
    }
  }

  if (config.mapping.category) {
    const categoryValue = sourceRow[config.mapping.category]
    if (categoryValue != null && String(categoryValue).trim() !== '') {
      transformed.category = String(categoryValue).trim()
    }
  }

  if (config.mapping.sku) {
    const skuValue = sourceRow[config.mapping.sku]
    if (skuValue != null && String(skuValue).trim() !== '') {
      transformed.sku = String(skuValue).trim()
    }
  }

  if (config.mapping.supplier) {
    const supplierValue = sourceRow[config.mapping.supplier]
    if (supplierValue != null && String(supplierValue).trim() !== '') {
      transformed.supplier = String(supplierValue).trim()
    }
  }

  if (config.mapping.stock) {
    const stockValue = sourceRow[config.mapping.stock]
    if (stockValue != null && String(stockValue).trim() !== '') {
      const stock = parseNumber(stockValue, sep)
      if (!isNaN(stock) && stock >= 0) {
        transformed.stock = Math.floor(stock)
      }
    }
  }

  return transformed
}

const ONE_DAY_MS = 86400000

function isValidRow(row: Partial<TransformedRow>): row is TransformedRow {
  if (
    !row.date ||
    !(row.date instanceof Date) ||
    isNaN(row.date.getTime())
  ) {
    return false
  }
  if (row.date.getTime() > Date.now() + ONE_DAY_MS) {
    return false
  }
  if (
    typeof row.product !== 'string' ||
    row.product.length === 0
  ) {
    return false
  }
  if (
    typeof row.quantity !== 'number' ||
    isNaN(row.quantity) ||
    row.quantity <= 0
  ) {
    return false
  }
  if (
    typeof row.price !== 'number' ||
    isNaN(row.price) ||
    row.price < 0
  ) {
    return false
  }
  return true
}

export function transformCSV(
  data: any[],
  config: TransformConfig
): TransformResult {
  const result: TransformedRow[] = []
  const errors: TransformError[] = []
  let skippedRows = 0

  if (!data || data.length === 0) {
    return {
      data: [],
      errors: [],
      stats: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        skippedRows: 0,
      },
    }
  }

  for (let i = 0; i < data.length; i++) {
    const sourceRow = data[i]
    const rowNumber = i + 1

    try {
      const transformed = applyMapping(sourceRow, config, rowNumber)

      if (isValidRow(transformed)) {
        result.push(transformed as TransformedRow)
      } else {
        skippedRows++
      }
    } catch (err: any) {
      errors.push({
        row: rowNumber,
        field: err?.field ?? 'unknown',
        value: err?.value,
        reason: err?.message ?? String(err),
      })
    }
  }

  return {
    data: result,
    errors,
    stats: {
      totalRows: data.length,
      validRows: result.length,
      invalidRows: errors.length,
      skippedRows,
    },
  }
}
