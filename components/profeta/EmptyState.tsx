"use client";

import Link from "next/link";
import { Upload } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-card border border-dashed border-profeta-border bg-profeta-card p-8 text-center shadow-card">
        <p className="text-profeta-text-secondary mb-6">
          Ainda não há análise. Faça upload de um CSV para começar.
        </p>
        <Link
          href="/dashboard/upload"
          className="inline-flex items-center gap-2 rounded-component bg-profeta-green px-4 py-2.5 font-medium text-white transition-colors hover:bg-profeta-green/90"
        >
          <Upload className="h-4 w-4" />
          Fazer upload
        </Link>
      </div>
    </div>
  );
}
