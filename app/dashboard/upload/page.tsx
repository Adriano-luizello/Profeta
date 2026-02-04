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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Info,
} from 'lucide-react'

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

export default function UploadPage() {
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (uploadedFile: File) => {
    setFile(uploadedFile)
    setError(null)
    setStep('detecting')
    setUploadProgress(20)

    if (uploadedFile.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo: 10MB')
      setStep('upload')
      setUploadProgress(0)
      return
    }

    if (!uploadedFile.name.endsWith('.csv')) {
      setError('Arquivo deve ser .csv')
      setStep('upload')
      setUploadProgress(0)
      return
    }

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
            `Primeira: ${first?.reason ?? first?.message ?? 'erro desconhecido'}`
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
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Upload de Dados</h1>
        <p className="text-muted-foreground mt-2">
          Importe seus dados de vendas para gerar previsões inteligentes
        </p>
      </div>

      {step !== 'upload' && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Etapa {getStepNumber(step)} de 6</span>
                <span>{getStepLabel(step)}</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 'upload' && (
        <Card>
          <CardContent className="pt-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0]
                if (selectedFile) {
                  handleFileUpload(selectedFile)
                  e.target.value = ''
                }
              }}
              className="sr-only"
              id="file-upload"
              aria-label="Selecionar arquivo CSV"
            />
            <label
              htmlFor="file-upload"
              className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer block"
            >
              <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Faça upload do seu CSV</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Clique aqui ou no botão abaixo para selecionar um arquivo.
                <br />
                Formatos aceitos: Wide (colunas de meses) ou Long (linhas por data)
              </p>
              <span
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground shadow hover:bg-primary/90"
                role="presentation"
              >
                <Upload className="w-4 h-4" />
                Selecionar Arquivo CSV
              </span>
              <p className="text-xs text-muted-foreground mt-4">
                Tamanho máximo: 10MB
              </p>
            </label>
          </CardContent>
        </Card>
      )}

      {(step === 'detecting' || step === 'transforming') && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <h3 className="text-lg font-semibold mb-2">
                {step === 'detecting'
                  ? 'Analisando CSV...'
                  : 'Transformando dados...'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {step === 'detecting'
                  ? 'Detectando formato e estrutura do arquivo'
                  : 'Convertendo para formato padrão'}
              </p>
              <Progress value={uploadProgress} className="mt-4 max-w-xs mx-auto" />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'map' && (
        <>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>
              Formato detectado:{' '}
              {format?.type === 'wide'
                ? 'Wide (colunas de meses)'
                : 'Long (linhas por data)'}
            </AlertTitle>
            <AlertDescription>
              {format?.type === 'wide'
                ? 'Os dados foram convertidos automaticamente para formato de linhas. Agora mapeie as colunas.'
                : 'Mapeie as colunas do seu CSV para o formato esperado.'}
            </AlertDescription>
          </Alert>

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

      {step === 'validate' && validation && (
        <div className="space-y-6">
          <Alert variant={validation.valid ? 'default' : 'destructive'}>
            {validation.valid ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
            <AlertTitle className="text-lg">
              {validation.valid
                ? 'Dados validados com sucesso!'
                : `${validation.errors.length} erro(s) encontrado(s)`}
            </AlertTitle>
            <AlertDescription>
              {validation.valid
                ? 'Seus dados estão prontos para serem processados.'
                : 'Corrija os erros abaixo antes de continuar.'}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-green-600 dark:text-green-500">
                  {validation.stats.validRows}
                </div>
                <p className="text-sm text-muted-foreground">Linhas válidas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-500">
                  {validation.stats.uniqueProducts}
                </div>
                <p className="text-sm text-muted-foreground">Produtos únicos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-500">
                  {validation.stats.dateRange.days}
                </div>
                <p className="text-sm text-muted-foreground">Dias de histórico</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">
                  {validation.stats.dateRange.min.toLocaleDateString('pt-BR')}
                  <br />
                  até
                  <br />
                  {validation.stats.dateRange.max.toLocaleDateString('pt-BR')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Período</p>
              </CardContent>
            </Card>
          </div>

          {validation.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Avisos</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {validation.warnings.map((w, i) => (
                    <li key={i} className="text-sm">
                      {w.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {validation.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Erros encontrados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {validation.errors.slice(0, 20).map((e, i) => (
                    <div
                      key={i}
                      className="text-sm border-l-2 border-destructive pl-3 py-1"
                    >
                      <strong>Linha {e.row}:</strong> {e.message}
                      {e.value !== undefined && (
                        <span className="text-muted-foreground">
                          {' '}
                          (valor: {JSON.stringify(e.value)})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {validation.errors.length > 20 && (
                  <p className="text-sm text-muted-foreground mt-3 text-center">
                    ...e mais {validation.errors.length - 20} erro(s)
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setStep('map')
                setError(null)
              }}
            >
              Voltar ao Mapeamento
            </Button>
            {validation.valid && (
              <Button onClick={handleSave} size="lg" className="flex-1">
                Salvar e Processar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      )}

      {step === 'saving' && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6 py-6">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">
                  {savingProductCount > 0
                    ? `Processando ${savingProductCount} produtos...`
                    : 'Salvando dados...'}
                </p>
                {savingProductCount > 0 && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Tempo estimado:{' '}
                      {Math.ceil((savingProductCount * 7) / 60)} minuto
                      {Math.ceil((savingProductCount * 7) / 60) > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      O sistema processa aproximadamente 8–10 produtos por minuto
                    </p>
                  </>
                )}
                {savingProductCount === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Processando dados e gerando previsões. Isso pode levar alguns
                    minutos.
                  </p>
                )}
              </div>
              <div className="space-y-2 text-sm border-t pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                  <span>Upload completado</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                  <span>Limpeza de dados (GPT)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                  <span>Gerando previsões (Prophet)...</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'done' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600 dark:text-green-500" />
              <h3 className="text-2xl font-bold mb-2 text-green-600 dark:text-green-500">
                Upload concluído!
              </h3>
              <p className="text-muted-foreground mb-4">
                Seus dados foram processados com sucesso.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecionando para o dashboard...
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
