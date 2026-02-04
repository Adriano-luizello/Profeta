'use client'

import { useCallback, useState, useRef } from 'react'
import Papa from 'papaparse'
import { validateCSVData, formatValidationErrors } from '@/lib/utils/csv-validator'
import { ValidationResult, UploadState } from '@/types/csv'

interface CSVUploadSimpleProps {
  onUploadSuccess?: (validationResult: ValidationResult) => void
  onUploadError?: (error: string) => void
}

export default function CSVUploadSimple({ onUploadSuccess, onUploadError }: CSVUploadSimpleProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    success: false,
  })
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processCSVFile = useCallback((file: File) => {
    setUploadState({ uploading: true, progress: 10, error: null, success: false })
    setValidationResult(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setUploadState((prev) => ({ ...prev, progress: 50 }))

        // Validate the parsed data
        const validation = validateCSVData(results.data)
        setValidationResult(validation)

        if (validation.valid) {
          setUploadState({ uploading: false, progress: 100, error: null, success: true })
          onUploadSuccess?.(validation)
        } else {
          const errorMessage = formatValidationErrors(validation.errors)
          setUploadState({
            uploading: false,
            progress: 0,
            error: errorMessage,
            success: false,
          })
          onUploadError?.(errorMessage)
        }
      },
      error: (error) => {
        const errorMsg = `Erro ao processar CSV: ${error.message}`
        setUploadState({ uploading: false, progress: 0, error: errorMsg, success: false })
        onUploadError?.(errorMsg)
      },
    })
  }, [onUploadSuccess, onUploadError])

  const handleFile = useCallback(
    (file: File) => {
      // Validate file type
      if (!file.name.endsWith('.csv')) {
        const error = 'Por favor, selecione um arquivo CSV válido'
        setUploadState({ uploading: false, progress: 0, error, success: false })
        onUploadError?.(error)
        return
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        const error = 'Arquivo muito grande. Tamanho máximo: 10MB'
        setUploadState({ uploading: false, progress: 0, error, success: false })
        onUploadError?.(error)
        return
      }

      processCSVFile(file)
    },
    [processCSVFile, onUploadError]
  )

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleClick = () => {
    if (!uploadState.uploading && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const resetUpload = () => {
    setUploadState({ uploading: false, progress: 0, error: null, success: false })
    setValidationResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="w-full">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Dropzone */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 scale-105' 
            : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600'
          }
          ${uploadState.uploading ? 'opacity-50 cursor-not-allowed' : ''}
          ${uploadState.success ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : ''}
          ${uploadState.error ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : ''}
        `}
      >
        {/* Icon */}
        <div className="text-6xl mb-4">
          {uploadState.uploading && '⏳'}
          {uploadState.success && '✅'}
          {uploadState.error && '❌'}
          {!uploadState.uploading && !uploadState.success && !uploadState.error && (isDragging ? '📥' : '📊')}
        </div>

        {/* Text */}
        <div className="space-y-2">
          {isDragging ? (
            <p className="text-lg font-medium text-blue-600 dark:text-blue-400">
              Solte o arquivo aqui...
            </p>
          ) : uploadState.uploading ? (
            <>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                Processando arquivo...
              </p>
              <div className="w-full max-w-xs mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </>
          ) : uploadState.success ? (
            <>
              <p className="text-lg font-medium text-green-600 dark:text-green-400">
                Arquivo validado com sucesso! ✨
              </p>
              {validationResult && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  <p>{validationResult.summary.totalRows} linhas processadas</p>
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    {validationResult.summary.validRows} linhas válidas
                  </p>
                </div>
              )}
            </>
          ) : uploadState.error ? (
            <>
              <p className="text-lg font-medium text-red-600 dark:text-red-400">
                Erro na validação
              </p>
              <p className="text-sm text-red-500 dark:text-red-400 mt-2 whitespace-pre-wrap max-w-md mx-auto text-left">
                {uploadState.error}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                Arraste seu arquivo CSV aqui
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ou clique para selecionar
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                Máximo: 10MB • Formato: CSV
              </p>
            </>
          )}
        </div>
      </div>

      {/* Reset Button */}
      {(uploadState.success || uploadState.error) && (
        <div className="mt-4 text-center">
          <button
            onClick={(e) => {
              e.stopPropagation()
              resetUpload()
            }}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
          >
            Fazer novo upload
          </button>
        </div>
      )}

      {/* CSV Format Help */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          📋 Formato do CSV esperado:
        </h4>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <p><strong>Colunas obrigatórias:</strong> date, product, quantity, price</p>
          <p><strong>Colunas opcionais:</strong> category, description</p>
          <p className="mt-2"><strong>Exemplo:</strong></p>
          <code className="block mt-1 p-2 bg-white dark:bg-gray-900 rounded text-xs">
            date,product,category,quantity,price,description<br />
            2024-01-15,Camiseta Azul,Roupas,10,29.90,Tamanho M<br />
            2024-01-16,Calça Jeans,Roupas,5,89.90,Tamanho 42
          </code>
        </div>
      </div>
    </div>
  )
}
