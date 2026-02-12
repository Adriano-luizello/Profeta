"use client";

export function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-profeta-border shadow-2xl overflow-hidden bg-white">
      <div className="h-10 bg-profeta-surface border-b border-profeta-border flex items-center px-4 gap-2">
        <div className="w-3 h-3 rounded-full bg-red-400/60" aria-hidden />
        <div className="w-3 h-3 rounded-full bg-amber-400/60" aria-hidden />
        <div className="w-3 h-3 rounded-full bg-green-400/60" aria-hidden />
        <div className="flex-1 mx-8">
          <div className="h-5 bg-white rounded-md border border-profeta-border flex items-center px-3">
            <span className="text-[10px] text-profeta-muted">app.profeta.ai/dashboard</span>
          </div>
        </div>
      </div>
      <div className="min-h-[280px] bg-profeta-surface flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
