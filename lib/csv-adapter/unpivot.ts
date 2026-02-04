/**
 * Unpivot Engine: transforma CSV Wide (colunas de meses) em formato Long (linhas por data).
 */

export interface UnpivotConfig {
  productColumn: string
  dateColumns: string[]
  valueType: 'quantity' | 'revenue'
  preserveColumns: string[] // colunas extras a manter (category, supplier, etc.)
}

export interface UnpivotResult {
  data: any[]
  stats: {
    originalRows: number
    resultRows: number
    skippedEmpty: number
  }
}

/**
 * Converte valor bruto para número, tratando vazios e formatos com vírgula.
 * Retorna null se vazio, zero ou inválido.
 */
function parseNumericValue(value: any): number | null {
  if (value === null || value === undefined || value === '' || value === 0) {
    return null
  }

  let str = String(value).trim()
  if (str === '') return null

  str = str.replace(/[^\d.,-]/g, '')
  str = str.replace(',', '.')

  const num = parseFloat(str)
  return isNaN(num) || num === 0 ? null : num
}

/**
 * Converte string no formato YYYY-MM para data no primeiro dia do mês (YYYY-MM-01).
 */
function convertMonthToDate(monthString: string): string {
  const regex = /^\d{4}-\d{2}$/
  if (!regex.test(monthString)) {
    throw new Error(`Data inválida: ${monthString}. Esperado formato YYYY-MM.`)
  }
  return `${monthString}-01`
}

/**
 * Transforma CSV em formato Wide (colunas por mês) para formato Long (uma linha por data).
 * Não modifica o array original.
 */
export function unpivotWideCSV(data: any[], config: UnpivotConfig): UnpivotResult {
  if (!config.productColumn) {
    throw new Error('productColumn é obrigatório')
  }

  if (!config.dateColumns || config.dateColumns.length === 0) {
    throw new Error('dateColumns não pode estar vazio')
  }

  if (!data || data.length === 0) {
    throw new Error('Dados não podem estar vazios')
  }

  const firstRow = data[0]
  if (!(config.productColumn in firstRow)) {
    throw new Error(`Coluna '${config.productColumn}' não encontrada no CSV`)
  }

  for (const dateCol of config.dateColumns) {
    if (!(dateCol in firstRow)) {
      throw new Error(`Coluna de data '${dateCol}' não encontrada no CSV`)
    }
  }

  const result: any[] = []
  let skippedEmpty = 0

  for (const row of data) {
    const productValue = row[config.productColumn]

    if (!productValue || String(productValue).trim() === '') {
      continue
    }

    const fixedData: Record<string, any> = {}
    for (const col of config.preserveColumns) {
      const value = row[col]
      if (value !== undefined && value !== null && value !== '') {
        fixedData[col] = value
      }
    }

    for (const dateCol of config.dateColumns) {
      const rawValue = row[dateCol]
      const numericValue = parseNumericValue(rawValue)

      if (numericValue === null) {
        skippedEmpty++
        continue
      }

      const dateStr = convertMonthToDate(dateCol)

      const newRow: any = {
        date: dateStr,
        product: String(productValue).trim(),
        price: 0,
      }

      if (config.valueType === 'quantity') {
        newRow.quantity = numericValue
      } else {
        newRow.revenue = numericValue
      }

      Object.assign(newRow, fixedData)
      result.push(newRow)
    }
  }

  return {
    data: result,
    stats: {
      originalRows: data.length,
      resultRows: result.length,
      skippedEmpty,
    },
  }
}
