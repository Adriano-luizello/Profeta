import { CSVRow, ValidationError, ValidationResult } from '@/types/csv'

/**
 * Required columns in the CSV file
 */
const REQUIRED_COLUMNS = ['date', 'product', 'quantity', 'price']

/**
 * Optional columns (supplier can also come as "fornecedor"; stock as "estoque")
 */
const OPTIONAL_COLUMNS = ['category', 'description', 'supplier', 'fornecedor', 'stock', 'estoque']

const SUPPLIER_KEYS = [
  'supplier',
  'fornecedor',
  'Supplier',
  'Fornecedor',
  'FORNECEDOR',
  'SUPPLIER',
]

function getSupplierFromRow(row: Record<string, unknown>): string | undefined {
  for (const k of SUPPLIER_KEYS) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  for (const key of Object.keys(row)) {
    const n = key.trim().toLowerCase()
    const isSupplierCol =
      n === 'supplier' ||
      n === 'fornecedor' ||
      n.startsWith('supplier') ||
      n.startsWith('fornecedor')
    if (isSupplierCol) {
      const v = row[key]
      if (v != null && String(v).trim() !== '') return String(v).trim()
    }
  }
  return undefined
}

/**
 * Validates if the date string is in a valid format
 */
function isValidDate(dateString: string): boolean {
  // Accept formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

/**
 * Validates a single CSV row
 */
function validateRow(row: any, rowIndex: number): ValidationError[] {
  const errors: ValidationError[] = []

  // Check required fields
  REQUIRED_COLUMNS.forEach((column) => {
    if (!row[column] || row[column].toString().trim() === '') {
      errors.push({
        row: rowIndex,
        field: column,
        message: `Campo obrigatório "${column}" está vazio`,
      })
    }
  })

  // Validate date format
  if (row.date && !isValidDate(row.date)) {
    errors.push({
      row: rowIndex,
      field: 'date',
      message: 'Formato de data inválido. Use YYYY-MM-DD, DD/MM/YYYY ou MM/DD/YYYY',
    })
  }

  // Validate quantity is a positive number
  if (row.quantity) {
    const quantity = parseFloat(row.quantity)
    if (isNaN(quantity) || quantity <= 0) {
      errors.push({
        row: rowIndex,
        field: 'quantity',
        message: 'Quantidade deve ser um número positivo',
      })
    }
  }

  // Validate price is a positive number
  if (row.price) {
    const price = parseFloat(row.price)
    if (isNaN(price) || price < 0) {
      errors.push({
        row: rowIndex,
        field: 'price',
        message: 'Preço deve ser um número não-negativo',
      })
    }
  }

  // Validate stock when present (optional)
  const stockRaw =
    row.stock ?? row.estoque ?? row.Stock ?? row.Estoque ?? row.STOCK ?? row.ESTOQUE
  if (stockRaw != null && String(stockRaw).trim() !== '') {
    const n = parseInt(String(stockRaw), 10)
    if (isNaN(n) || n < 0) {
      errors.push({
        row: rowIndex,
        field: 'stock',
        message: 'Estoque deve ser um número inteiro não-negativo',
      })
    }
  }

  return errors
}

/**
 * Validates the entire CSV data
 */
export function validateCSVData(data: any[]): ValidationResult {
  if (!data || data.length === 0) {
    return {
      valid: false,
      errors: [{ row: 0, field: 'file', message: 'Arquivo CSV está vazio' }],
      data: [],
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
      },
    }
  }

  // Check if required columns exist
  const firstRow = data[0]
  const missingColumns = REQUIRED_COLUMNS.filter(
    (col) => !(col in firstRow)
  )

  if (missingColumns.length > 0) {
    return {
      valid: false,
      errors: [
        {
          row: 0,
          field: 'columns',
          message: `Colunas obrigatórias faltando: ${missingColumns.join(', ')}`,
        },
      ],
      data: [],
      summary: {
        totalRows: data.length,
        validRows: 0,
        invalidRows: data.length,
      },
    }
  }

  // Validate each row
  const allErrors: ValidationError[] = []
  const validData: CSVRow[] = []

  data.forEach((row, index) => {
    const rowErrors = validateRow(row, index + 1)
    
    if (rowErrors.length === 0) {
      const supplier = getSupplierFromRow(row as Record<string, unknown>)
      const stockRaw =
        row.stock ?? row.estoque ?? row.Stock ?? row.Estoque ?? row.STOCK ?? row.ESTOQUE
      let stock: number | undefined
      if (stockRaw != null && String(stockRaw).trim() !== '') {
        const n = parseInt(String(stockRaw), 10)
        if (!isNaN(n) && n >= 0) stock = n
      }
      validData.push({
        date: row.date,
        product: row.product.trim(),
        category: row.category?.trim(),
        quantity: parseFloat(row.quantity),
        price: parseFloat(row.price),
        description: row.description?.trim(),
        supplier,
        stock,
      })
    } else {
      allErrors.push(...rowErrors)
    }
  })

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    data: validData,
    summary: {
      totalRows: data.length,
      validRows: validData.length,
      invalidRows: data.length - validData.length,
    },
  }
}

/**
 * Formats validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return ''
  
  const maxDisplay = 5
  const displayed = errors.slice(0, maxDisplay)
  const remaining = errors.length - maxDisplay

  let message = 'Erros encontrados:\n\n'
  displayed.forEach((error) => {
    message += `• Linha ${error.row}, campo "${error.field}": ${error.message}\n`
  })

  if (remaining > 0) {
    message += `\n... e mais ${remaining} erro(s)`
  }

  return message
}
