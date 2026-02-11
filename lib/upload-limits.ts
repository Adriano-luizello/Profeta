/**
 * Limites de upload de CSV
 * 
 * IMPORTANTE: Estes limites existem para prevenir abuso/acidentes, NÃO para restringir uso legítimo.
 * Cenário típico: 100-500 produtos × 12 meses ≈ 6k-60k linhas ≈ 0.5-5 MB
 * Cenário extremo: 1000 produtos × 2 anos ≈ 24k linhas ≈ 50 MB
 */

export const UPLOAD_LIMITS = {
  /** Hard limit: Arquivos maiores são BLOQUEADOS */
  MAX_FILE_SIZE_MB: 50,
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024,
  
  /** Warning limit: Arquivos maiores mostram aviso, mas deixam continuar */
  WARNING_FILE_SIZE_MB: 10,
  WARNING_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  
  /** Warning limit: Muitas linhas pode indicar processamento longo */
  WARNING_ROWS: 50000,  // ~500 produtos × ~100 registros
  
  /** Extensões permitidas */
  ALLOWED_EXTENSIONS: ['.csv', '.CSV'],
} as const

/**
 * Formata tamanho de arquivo para exibição
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Estima número de produtos com base no número de linhas
 * Assume ~100 registros por produto em média (12 meses × 8 anos = 96)
 */
export function estimateProducts(lineCount: number): number {
  return Math.ceil(lineCount / 100)
}
