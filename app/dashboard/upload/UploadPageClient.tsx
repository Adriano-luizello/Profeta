'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { detectCSVFormat } from '@/lib/csv-adapter/detector'
import { unpivotWideCSV } from '@/lib/csv-adapter/unpivot'
import { ColumnMapper } from '@/components/upload/column-mapper'
import type { ColumnMapping } from '@/components/upload/column-mapper'
import { transformCSV } from '@/lib/csv-adapter/transformer'
import { validateTransformedData } from '@/lib/csv-adapter/validator'
import type { TransformedRow } from '@/lib/csv-adapter/transformer'
import type { ValidationResult } from '@/lib/csv-adapter/validator'
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Info,
} from 'lucide-react'
import { UPLOAD_LIMITS, formatFileSize, estimateProducts } from '@/lib/upload-limits'

type Step =
  | 'upload'
  | 'detecting'
  | 'preview'
  | 'map'
  | 'transforming'
  | 'validate'
  | 'saving'
  | 'done'

function getStepNumber(step: Step): number {
  switch (step) {
    case 'upload':
      return 1
    case 'detecting':
    case 'preview':
    case 'transforming':
      return 2
    case 'map':
      return 3
    case 'validate':
      return 4
    case 'saving':
      return 5
    case 'done':
      return 6
    default:
      return 1
  }
}

function getStepLabel(step: Step): string {
  const labels: Record<Step, string> = {
    upload: 'Upload',
    detecting: 'Detectando formato',
    preview: 'Preview',
    map: 'Mapeamento de colunas',
    transforming: 'Transformando',
    validate: 'Validação',
    saving: 'Salvando',
    done: 'Concluído',
  }
  return labels[step]
}

export default function UploadPageClient() {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [format, setFormat] = useState<ReturnType<typeof detectCSVFormat> | null>(null)
  const [transformedData, setTransformedData] = useState<TransformedRow[]>([])
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [savingProductCount, setSavingProductCount] = useState<number>(0)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (uploadedFile: File) => {
    setFile(uploadedFile)
    setError(null)
    setWarningMessage(null)

    // Validação 1: HARD LIMIT - Tamanho máximo
    if (uploadedFile.size > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) {
      setError(
        `Arquivo muito grande (${formatFileSize(uploadedFile.size)}). ` +
        `Máximo permitido: ${UPLOAD_LIMITS.MAX_FILE_SIZE_MB} MB. ` +
        `Reduza o tamanho do arquivo ou divida em partes menores.`
      )
      setStep('upload')
      setUploadProgress(0)
      return
    }

    // Validação 2: Tipo de arquivo
    const hasValidExtension = UPLOAD_LIMITS.ALLOWED_EXTENSIONS.some(ext =>
      uploadedFile.name.toLowerCase().endsWith(ext.toLowerCase())
    )
    if (!hasValidExtension) {
      setError(
        `Formato inválido. Envie um arquivo .csv ` +
        `(arquivo atual: ${uploadedFile.name})`
      )
      setStep('upload')
      setUploadProgress(0)
      return
    }

    // Validação 3: WARNING - Arquivo grande (deixa continuar)
    if (uploadedFile.size > UPLOAD_LIMITS.WARNING_FILE_SIZE_BYTES) {
      const sizeStr = formatFileSize(uploadedFile.size)
      setWarningMessage(
        `⚠️ Arquivo grande (${sizeStr}). ` +
        `O processamento pode levar alguns minutos. Deseja continuar?`
      )
      setPendingFile(uploadedFile)
      return
    }

    // Prosseguir com processamento
    processFile(uploadedFile)
  }

  const processFile = (uploadedFile: File) => {
    setStep('detecting')
    setUploadProgress(20)
    setWarningMessage(null)
    setPendingFile(null)

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = results.data as any[]
          // Coletar TODAS as colunas: meta.fields (ordem original) + keys da primeira linha (evitar colunas faltando)
          const fromMeta = (results.meta?.fields || []).map((h: string) =>
            String(h ?? '').trim().replace(/^\ufeff/, '')
          )
          const fromFirstRow =
            data?.length > 0 && typeof data[0] === 'object' && data[0] !== null
              ? Object.keys(data[0] as object).map((k) =>
                  String(k ?? '').trim().replace(/^\ufeff/, '')
                )
              : []
          const seen = new Set<string>()
          const hdrs: string[] = []
          for (const h of fromMeta) {
            if (h && !seen.has(h)) {
              seen.add(h)
              hdrs.push(h)
            }
          }
          for (const h of fromFirstRow) {
            if (h && !seen.has(h)) {
              seen.add(h)
              hdrs.push(h)
            }
          }

          if (!data || data.length === 0) {
            setError('Arquivo CSV está vazio')
            setStep('upload')
            setUploadProgress(0)
            return
          }

          if (!hdrs || hdrs.length === 0) {
            setError('CSV não possui cabeçalhos')
            setStep('upload')
            setUploadProgress(0)
            return
          }

          // Validação 4: WARNING - Muitas linhas (deixa continuar)
          const lineCount = data.length
          if (lineCount > UPLOAD_LIMITS.WARNING_ROWS) {
            const estimatedProducts = estimateProducts(lineCount)
            setWarningMessage(
              `⚠️ Arquivo com ${lineCount.toLocaleString('pt-BR')} linhas ` +
              `(~${estimatedProducts} produtos estimados). ` +
              `O processamento pode demorar. Deseja continuar?`
            )
            setPendingFile(uploadedFile)
            setParsedData(data)
            setHeaders(hdrs)
            setStep('upload')
            return
          }

          setParsedData(data)
          setHeaders(hdrs)
          setUploadProgress(40)

          const detected = detectCSVFormat(hdrs, data.slice(0, 10))
          setFormat(detected)
          setUploadProgress(60)

          if (detected.type === 'wide') {
            handleUnpivot(data, detected, hdrs)
          } else if (detected.type === 'long') {
            setStep('map')
            setUploadProgress(80)
          } else {
            setError(
              'Formato de CSV não reconhecido. ' +
                'O arquivo deve ter colunas de data ou estar em formato mensal (YYYY-MM).'
            )
            setStep('upload')
            setUploadProgress(0)
          }
        } catch (err: any) {
          setError('Erro ao processar CSV: ' + (err?.message ?? String(err)))
          setStep('upload')
          setUploadProgress(0)
        }
      },
      error: (err) => {
        setError('Erro ao ler arquivo: ' + (err?.message ?? String(err)))
        setStep('upload')
        setUploadProgress(0)
      },
    })
  }

  const handleUnpivot = (
    data: any[],
    detectedFormat: ReturnType<typeof detectCSVFormat>,
    currentHeaders: string[]
  ) => {
    try {
      setStep('transforming')
      setUploadProgress(70)

      // Preservar TODAS as colunas que não são data nem produto (para não perder "Product name" etc.)
      const preserveCols = currentHeaders.filter(
        (h) =>
          !detectedFormat.dateColumns.includes(h) &&
          h !== detectedFormat.productColumn
      )

      const result = unpivotWideCSV(data, {
        productColumn: detectedFormat.productColumn || currentHeaders[0],
        dateColumns: detectedFormat.dateColumns,
        valueType: 'quantity',
        preserveColumns: preserveCols,
      })

      setParsedData(result.data)
      setHeaders(result.data[0] ? Object.keys(result.data[0]) : [])
      setUploadProgress(80)
      setStep('map')
    } catch (err: any) {
      setError('Erro ao transformar formato Wide: ' + (err?.message ?? String(err)))
      setStep('upload')
      setUploadProgress(0)
    }
  }

  const handleMappingComplete = (mapping: ColumnMapping) => {
    try {
      setStep('transforming')
      setUploadProgress(85)
      setError(null)

      const transformResult = transformCSV(parsedData, {
        mapping,
        dateFormat: 'auto',
        decimalSeparator: ',',
      })

      if (transformResult.errors.length > 0) {
        const first = transformResult.errors[0]
        setError(
          `Erro ao transformar dados: ${transformResult.errors.length} linha(s) com erro. ` +
            `Primeira: ${first?.reason ?? 'erro desconhecido'}`
        )
        setStep('map')
        return
      }

      setTransformedData(transformResult.data)
      setUploadProgress(90)

      const validationResult = validateTransformedData(transformResult.data)
      setValidation(validationResult)
      setUploadProgress(100)
      setStep('validate')
    } catch (err: any) {
      setError('Erro ao processar dados: ' + (err?.message ?? String(err)))
      setStep('map')
    }
  }

  const handleSave = async () => {
    if (!validation?.valid || transformedData.length === 0) return

    setStep('saving')
    setError(null)

    try {
      const dataToSave = transformedData.map((row) => ({
        date: row.date.toISOString().split('T')[0],
        product: row.product,
        quantity: row.quantity,
        price: row.price,
        ...(row.category != null && row.category !== '' && { category: row.category }),
        ...(row.sku != null && row.sku !== '' && { sku: row.sku }),
        ...(row.supplier != null && row.supplier !== '' && { supplier: row.supplier }),
        ...(row.stock != null && { stock: row.stock }),
      }))

      const response = await fetch('/api/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file?.name || 'upload.csv',
          csvData: dataToSave,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Tratamento específico para erro 413 (Payload Too Large)
        if (response.status === 413) {
          throw new Error(
            errorData.message ||
            `Arquivo excede o limite de ${UPLOAD_LIMITS.MAX_FILE_SIZE_MB} MB. ` +
            `Reduza o tamanho do arquivo ou divida em partes menores.`
          )
        }

        throw new Error(errorData.error || 'Erro ao salvar dados')
      }

      const saveData = await response.json()
      const analysisId = saveData.analysisId ?? saveData.analysis_id
      const totalProducts = saveData.totalProducts ?? 0
      setSavingProductCount(totalProducts)

      if (analysisId) {
        const pipelineResponse = await fetch(
          `/api/analyses/${analysisId}/pipeline`,
          { method: 'POST' }
        )

        if (!pipelineResponse.ok) {
          const pipeData = await pipelineResponse.json().catch(() => ({}))
          throw new Error(
            pipeData.error || 'Erro ao processar pipeline (limpeza e previsão).'
          )
        }
      }

      setStep('done')

      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 2000)
    } catch (err: any) {
      setError('Erro ao salvar: ' + (err?.message ?? String(err)))
      setStep('validate')
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-profeta-text-primary">
          Upload de Dados
        </h1>
        <p className="mt-0.5 text-sm text-profeta-text-secondary">
          Importe seus dados de vendas para gerar previsões inteligentes
        </p>
      </div>

      {step !== "upload" && (
        <div className="rounded-card border border-profeta-border bg-profeta-card p-6 shadow-card">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-profeta-text-secondary">
              <span>Etapa {getStepNumber(step)} de 6</span>
              <span>{getStepLabel(step)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-profeta-surface">
              <div
                className="h-full rounded-full bg-profeta-green transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Erro</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {warningMessage && pendingFile && (
        <div className="rounded-xl border border-profeta-border bg-profeta-card p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 text-profeta-amber" />
            <div className="flex-1 space-y-4">
              <p className="text-lg font-medium text-profeta-text-primary">
                Atenção
              </p>
              <p className="text-sm text-profeta-text-secondary">
                {warningMessage}
              </p>
              <div className="space-y-1 text-sm text-profeta-text-muted">
                <p>
                  📁 <strong>Arquivo:</strong> {pendingFile.name}
                </p>
                <p>
                  📊 <strong>Tamanho:</strong> {formatFileSize(pendingFile.size)}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (parsedData.length > 0 && headers.length > 0) {
                    setWarningMessage(null);
                    setPendingFile(null);
                    setUploadProgress(40);
                    const detected = detectCSVFormat(
                      headers,
                      parsedData.slice(0, 10)
                    );
                    setFormat(detected);
                    setUploadProgress(60);
                    if (detected.type === "wide") {
                      handleUnpivot(parsedData, detected, headers);
                    } else if (detected.type === "long") {
                      setStep("map");
                      setUploadProgress(80);
                    } else {
                      setError(
                        "Formato de CSV não reconhecido. " +
                          "O arquivo deve ter colunas de data ou estar em formato mensal (YYYY-MM)."
                      );
                      setStep("upload");
                      setUploadProgress(0);
                    }
                  } else {
                    processFile(pendingFile);
                  }
                }}
                className="flex-1 rounded-xl bg-profeta-green px-6 py-2.5 font-medium text-white transition-colors hover:bg-profeta-green/90"
              >
                Continuar
              </button>
              <button
                type="button"
                onClick={() => {
                  setWarningMessage(null);
                  setPendingFile(null);
                  setFile(null);
                  setParsedData([]);
                  setHeaders([]);
                  setStep("upload");
                  setUploadProgress(0);
                }}
                className="rounded-xl border border-profeta-border px-4 py-2.5 font-medium text-profeta-text-secondary transition-colors hover:bg-profeta-surface"
              >
                Cancelar
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {step === "upload" && (
        <div className="rounded-card border border-profeta-border bg-profeta-card p-8 shadow-card">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0];
              if (selectedFile) {
                handleFileUpload(selectedFile);
                e.target.value = "";
              }
            }}
            className="sr-only"
            id="file-upload"
            aria-label="Selecionar arquivo CSV"
          />
          <label
            htmlFor="file-upload"
            className="block cursor-pointer rounded-xl border-2 border-dashed border-profeta-border p-12 text-center transition-all hover:border-profeta-green/50 hover:bg-profeta-green/5"
          >
            <Upload className="mx-auto mb-4 h-16 w-16 text-profeta-text-muted" />
            <h3 className="mb-2 text-xl font-semibold text-profeta-text-primary">
              Faça upload do seu CSV
            </h3>
            <p className="mb-6 text-sm text-profeta-text-secondary">
              Clique aqui ou no botão abaixo para selecionar um arquivo.
              <br />
              Formatos aceitos: Wide (colunas de meses) ou Long (linhas por data)
            </p>
            <span
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-profeta-green px-6 py-2.5 text-sm font-medium text-white shadow transition-colors hover:bg-profeta-green/90"
              role="presentation"
            >
              <Upload className="h-4 w-4" />
              Selecionar Arquivo CSV
            </span>
            <p className="mt-4 text-xs text-profeta-text-muted">
              Tamanho máximo: {UPLOAD_LIMITS.MAX_FILE_SIZE_MB} MB
            </p>
          </label>
        </div>
      )}

      {(step === "detecting" || step === "transforming") && (
        <div className="rounded-card border border-profeta-border bg-profeta-card p-6 shadow-card">
          <div className="py-8 text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-profeta-green" />
            <h3 className="mb-2 text-lg font-semibold text-profeta-text-primary">
              {step === "detecting"
                ? "Analisando CSV..."
                : "Transformando dados..."}
            </h3>
            <p className="text-sm text-profeta-text-secondary">
              {step === "detecting"
                ? "Detectando formato e estrutura do arquivo"
                : "Convertendo para formato padrão"}
            </p>
            <div className="mx-auto mt-4 max-w-xs overflow-hidden rounded-full bg-profeta-surface">
              <div
                className="h-2 rounded-full bg-profeta-green transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {step === "map" && (
        <>
          <div className="mb-6 flex gap-2 rounded-xl border border-profeta-border bg-profeta-card p-4">
            <Info className="h-4 w-4 shrink-0 text-profeta-green" />
            <div>
              <p className="font-medium text-profeta-text-primary">
                Formato detectado:{" "}
                {format?.type === "wide"
                  ? "Wide (colunas de meses)"
                  : "Long (linhas por data)"}
              </p>
              <p className="mt-1 text-sm text-profeta-text-secondary">
                {format?.type === "wide"
                  ? "Os dados foram convertidos automaticamente para formato de linhas. Agora mapeie as colunas."
                  : "Mapeie as colunas do seu CSV para o formato esperado."}
              </p>
            </div>
          </div>

          <ColumnMapper
            sourceHeaders={headers}
            data={parsedData}
            onMappingComplete={handleMappingComplete}
            onBack={() => {
              setStep('upload')
              setFile(null)
              setParsedData([])
              setHeaders([])
              setFormat(null)
              setError(null)
              setUploadProgress(0)
            }}
          />
        </>
      )}

      {step === "validate" && validation && (
        <div className="space-y-6">
          <div
            className={`flex gap-2 rounded-xl border p-4 ${
              validation.valid
                ? "border-profeta-border bg-profeta-card"
                : "border-red-100 bg-red-50"
            }`}
          >
            {validation.valid ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-profeta-green" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0 text-profeta-red" />
            )}
            <div>
              <p className="text-lg font-medium text-profeta-text-primary">
                {validation.valid
                  ? "Dados validados com sucesso!"
                  : `${validation.errors.length} erro(s) encontrado(s)`}
              </p>
              <p className="text-sm text-profeta-text-secondary">
                {validation.valid
                  ? "Seus dados estão prontos para serem processados."
                  : "Corrija os erros abaixo antes de continuar."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-card border border-profeta-border bg-profeta-card p-6 shadow-card">
              <div className="text-3xl font-bold text-profeta-green">
                {validation.stats.validRows}
              </div>
              <p className="text-sm text-profeta-text-secondary">
                Linhas válidas
              </p>
            </div>
            <div className="rounded-card border border-profeta-border bg-profeta-card p-6 shadow-card">
              <div className="text-3xl font-bold text-profeta-text-primary">
                {validation.stats.uniqueProducts}
              </div>
              <p className="text-sm text-profeta-text-secondary">
                Produtos únicos
              </p>
            </div>
            <div className="rounded-card border border-profeta-border bg-profeta-card p-6 shadow-card">
              <div className="text-3xl font-bold text-profeta-text-primary">
                {validation.stats.dateRange.days}
              </div>
              <p className="text-sm text-profeta-text-secondary">
                Dias de histórico
              </p>
            </div>
            <div className="rounded-card border border-profeta-border bg-profeta-card p-6 shadow-card">
              <div className="text-sm text-profeta-text-secondary">
                {validation.stats.dateRange.min.toLocaleDateString("pt-BR")}
                <br />
                até
                <br />
                {validation.stats.dateRange.max.toLocaleDateString("pt-BR")}
              </div>
              <p className="mt-1 text-xs text-profeta-text-muted">Período</p>
            </div>
          </div>

          {validation.warnings.length > 0 && (
            <div className="flex gap-2 rounded-xl border border-profeta-border bg-profeta-card p-4">
              <AlertTriangle className="h-4 w-4 shrink-0 text-profeta-amber" />
              <div>
                <p className="font-medium text-profeta-text-primary">Avisos</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-profeta-text-secondary">
                  {validation.warnings.map((w, i) => (
                    <li key={i}>{w.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {validation.errors.length > 0 && (
            <div className="overflow-hidden rounded-card border border-profeta-border bg-profeta-card shadow-card">
              <div className="border-b border-profeta-border px-4 py-3">
                <h3 className="font-semibold text-profeta-red">
                  Erros encontrados
                </h3>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto p-4">
                {validation.errors.slice(0, 20).map((e, i) => (
                  <div
                    key={i}
                    className="border-l-2 border-profeta-red py-1 pl-3 text-sm"
                  >
                    <strong>Linha {e.row}:</strong> {e.message}
                    {e.value !== undefined && (
                      <span className="text-profeta-text-muted">
                        {" "}
                        (valor: {JSON.stringify(e.value)})
                      </span>
                    )}
                  </div>
                ))}
                {validation.errors.length > 20 && (
                  <p className="mt-3 text-center text-sm text-profeta-text-muted">
                    ...e mais {validation.errors.length - 20} erro(s)
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                setStep("map");
                setError(null);
              }}
              className="rounded-xl border border-profeta-border px-4 py-2.5 font-medium text-profeta-text-secondary transition-colors hover:bg-profeta-surface"
            >
              Voltar ao Mapeamento
            </button>
            {validation.valid && (
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 rounded-xl bg-profeta-green px-6 py-2.5 font-medium text-white transition-colors hover:bg-profeta-green/90"
              >
                Salvar e Processar
                <ArrowRight className="ml-2 inline-block h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {step === "saving" && (
        <div className="rounded-card border border-profeta-border bg-profeta-card p-6 shadow-card">
          <div className="space-y-6 py-6">
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-profeta-green" />
            </div>
            <div className="space-y-2 text-center">
              <p className="text-lg font-medium text-profeta-text-primary">
                {savingProductCount > 0
                  ? `Processando ${savingProductCount} produtos...`
                  : "Salvando dados..."}
              </p>
              {savingProductCount > 0 && (
                <>
                  <p className="text-sm text-profeta-text-secondary">
                    Tempo estimado:{" "}
                    {Math.ceil((savingProductCount * 7) / 60)} minuto
                    {Math.ceil((savingProductCount * 7) / 60) > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-profeta-text-muted">
                    O sistema processa aproximadamente 8–10 produtos por minuto
                  </p>
                </>
              )}
              {savingProductCount === 0 && (
                <p className="text-sm text-profeta-text-secondary">
                  Processando dados e gerando previsões. Isso pode levar alguns
                  minutos.
                </p>
              )}
            </div>
            <div className="space-y-2 border-t border-profeta-border pt-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-profeta-green" />
                <span className="text-profeta-text-primary">Upload completado</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-profeta-green" />
                <span className="text-profeta-text-primary">
                  Limpeza de dados (GPT)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-profeta-green" />
                <span className="text-profeta-text-primary">
                  Gerando previsões (Prophet)...
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="rounded-card border border-profeta-border bg-profeta-card p-6 shadow-card">
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-profeta-green" />
            <h3 className="mb-2 text-2xl font-bold text-profeta-green">
              Upload concluído!
            </h3>
            <p className="mb-4 text-profeta-text-secondary">
              Seus dados foram processados com sucesso.
            </p>
            <p className="text-sm text-profeta-text-muted">
              Redirecionando para o dashboard...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
