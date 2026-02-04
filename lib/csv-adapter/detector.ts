/**
 * CSV Auto-Detector: identifica formato (Wide vs Long) e sugere mapeamento de colunas.
 * Compatível com cabeçalhos em português, inglês e espanhol.
 */

export interface CSVFormat {
  type: 'wide' | 'long' | 'unknown'
  dateColumns: string[]
  productColumn?: string
  quantityColumn?: string
  priceColumn?: string
  categoryColumn?: string
  supplierColumn?: string
  stockColumn?: string
  confidence: number // 0-1
  detectedPattern?: string
}

/** Regex para colunas no formato YYYY-MM (ex: 2024-06, 2024-07). */
const YYYY_MM_PATTERN = /^\d{4}-\d{2}$/

/**
 * Busca case-insensitive a primeira coluna cujo nome contém qualquer uma das keywords.
 * Retorna o índice da coluna ou undefined se não encontrar.
 */
export function findColumn(headers: string[], keywords: string[]): number | undefined {
  const normalizedKeywords = keywords.map((k) => k.trim().toLowerCase())
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i] ?? '').trim().toLowerCase()
    const matches = normalizedKeywords.some((kw) => header === kw || header.includes(kw))
    if (matches) return i
  }
  return undefined
}

/**
 * Retorna o nome da coluna no índice i (header original), ou undefined se fora do range.
 */
function getHeaderName(headers: string[], index: number): string | undefined {
  if (index < 0 || index >= headers.length) return undefined
  const name = headers[index]
  return name == null ? undefined : String(name).trim()
}

/**
 * Detecta se há 3 ou mais colunas no formato YYYY-MM.
 */
function detectWideDateColumns(headers: string[]): string[] {
  const dateCols: string[] = []
  for (const h of headers) {
    const name = String(h ?? '').trim()
    if (YYYY_MM_PATTERN.test(name)) dateCols.push(name)
  }
  return dateCols.length >= 3 ? dateCols : []
}

/**
 * Detecta formato do CSV (wide, long ou unknown) e sugere mapeamento de colunas.
 */
export function detectCSVFormat(headers: string[], firstRows: any[]): CSVFormat {
  const normalizedHeaders = headers.map((h) => String(h ?? '').trim()).filter(Boolean)
  if (normalizedHeaders.length === 0) {
    return {
      type: 'unknown',
      dateColumns: [],
      confidence: 0,
      detectedPattern: 'empty_headers',
    }
  }

  // --- WIDE: 3+ colunas YYYY-MM ---
  const wideDateColumns = detectWideDateColumns(normalizedHeaders)
  if (wideDateColumns.length >= 3) {
    const productIdx = findColumn(normalizedHeaders, [
      'product',
      'sku',
      'nome',
      'name',
      'produto',
      'producto',
      'item',
    ])
    const productColumn = productIdx !== undefined ? getHeaderName(normalizedHeaders, productIdx) : undefined
    return {
      type: 'wide',
      dateColumns: wideDateColumns,
      productColumn,
      confidence: 0.9,
      detectedPattern: 'wide_monthly_columns',
    }
  }

  // --- LONG: coluna de data + coluna de produto ---
  const dateIdx = findColumn(normalizedHeaders, ['date', 'data', 'dt', 'fecha', 'data_venda', 'sale_date'])
  const productIdx = findColumn(normalizedHeaders, [
    'product',
    'produto',
    'sku',
    'name',
    'nome',
    'producto',
    'item',
  ])

  if (dateIdx !== undefined && productIdx !== undefined) {
    const quantityIdx = findColumn(normalizedHeaders, [
      'quantity',
      'quantidade',
      'qty',
      'units',
      'sales',
      'vendas',
      'cantidad',
      'unidades',
    ])
    const priceIdx = findColumn(normalizedHeaders, [
      'price',
      'preco',
      'preço',
      'valor',
      'precio',
      'unit_price',
      'preco_unitario',
    ])
    const categoryIdx = findColumn(normalizedHeaders, [
      'category',
      'categoria',
      'categoría',
      'categoria_produto',
    ])
    const supplierIdx = findColumn(normalizedHeaders, [
      'supplier',
      'fornecedor',
      'proveedor',
      'fornecedor_nome',
    ])
    const stockIdx = findColumn(normalizedHeaders, [
      'stock',
      'estoque',
      'inventory',
      'inventario',
      'qty_stock',
    ])

    return {
      type: 'long',
      dateColumns: [getHeaderName(normalizedHeaders, dateIdx)!],
      productColumn: getHeaderName(normalizedHeaders, productIdx),
      quantityColumn: quantityIdx !== undefined ? getHeaderName(normalizedHeaders, quantityIdx) : undefined,
      priceColumn: priceIdx !== undefined ? getHeaderName(normalizedHeaders, priceIdx) : undefined,
      categoryColumn: categoryIdx !== undefined ? getHeaderName(normalizedHeaders, categoryIdx) : undefined,
      supplierColumn: supplierIdx !== undefined ? getHeaderName(normalizedHeaders, supplierIdx) : undefined,
      stockColumn: stockIdx !== undefined ? getHeaderName(normalizedHeaders, stockIdx) : undefined,
      confidence: 0.8,
      detectedPattern: 'long_date_product_rows',
    }
  }

  // --- UNKNOWN ---
  return {
    type: 'unknown',
    dateColumns: [],
    confidence: 0,
    detectedPattern: 'no_recognized_pattern',
  }
}
