'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard error]', error)
  }, [error])

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Alert variant="destructive" className="max-w-md">
        <AlertTitle>Erro ao carregar o dashboard</AlertTitle>
        <AlertDescription>
          {error.message || 'Algo deu errado. Verifique o console e tente novamente.'}
        </AlertDescription>
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={() => reset()}>
            Tentar novamente
          </Button>
        </div>
      </Alert>
    </div>
  )
}
