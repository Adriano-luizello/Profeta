'use client'

import dynamic from 'next/dynamic'

const UploadPageClient = dynamic(
  () => import('./UploadPageClient').then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-profeta-green border-t-transparent" />
          <p className="text-sm text-profeta-text-secondary">Carregando...</p>
        </div>
      </div>
    ),
  }
)

export default function UploadPage() {
  return <UploadPageClient />
}
