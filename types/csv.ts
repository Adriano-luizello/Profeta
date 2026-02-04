export interface CSVRow {
  date: string
  /** Nome descritivo do produto (ex: coluna "Product name"). */
  product: string
  category?: string
  quantity: number
  price: number
  description?: string
  /** SKU ou código único (ex: coluna "Sku"). Opcional; usado para agrupar linhas por produto. */
  sku?: string
  /** Fornecedor do produto; aceita coluna "supplier" ou "fornecedor" no CSV. */
  supplier?: string
  /** Estoque atual (opcional). Aceita "stock" ou "estoque" no CSV. Usamos o da linha mais recente por produto. */
  stock?: number
}

export interface ValidationError {
  row: number
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  data: CSVRow[]
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
  }
}

export interface UploadState {
  uploading: boolean
  progress: number
  error: string | null
  success: boolean
}
