'use client'

/**
 * Botão para gerar forecast.
 * Modo controlado: onGenerate, loading e error vêm do pai (ForecastSection).
 */

interface GenerateForecastButtonProps {
  onGenerate: () => void | Promise<void>
  loading?: boolean
  error?: string | null
  disabled?: boolean
  className?: string
}

export function GenerateForecastButton({
  onGenerate,
  loading = false,
  error = null,
  disabled = false,
  className = '',
}: GenerateForecastButtonProps) {
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => onGenerate()}
        disabled={disabled || loading}
        className={`
          px-4 py-2 rounded-lg font-medium
          transition-all duration-200
          ${
            loading
              ? 'bg-blue-400 cursor-wait'
              : 'bg-blue-600 hover:bg-blue-700'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          text-white
          disabled:opacity-50
          ${className}
        `}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Gerando Previsão...
          </span>
        ) : (
          <span className="flex items-center gap-2">📈 Gerar Previsão</span>
        )}
      </button>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-2 rounded">
          {error}
        </p>
      )}
    </div>
  )
}
