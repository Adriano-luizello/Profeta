"use client";

const GREEN = "#52796A";

export function SalesChartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <rect x="6" y="28" width="8" height="14" rx="2" fill={GREEN} fillOpacity="0.2" />
      <rect x="18" y="20" width="8" height="22" rx="2" fill={GREEN} fillOpacity="0.4" />
      <rect x="30" y="10" width="8" height="32" rx="2" fill={GREEN} />
      <path d="M10 26 L22 18 L34 8" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2" />
    </svg>
  );
}

export function ForecastIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <polyline points="4,36 12,30 20,32 28,22" stroke={GREEN} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="28,22 36,14 44,10" stroke={GREEN} strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="3 3" />
      <circle cx="28" cy="22" r="3" fill={GREEN} />
    </svg>
  );
}

export function AlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path d="M24 8 C18 8 14 14 14 20 L14 30 L10 34 L38 34 L34 30 L34 20 C34 14 30 8 24 8Z" stroke={GREEN} strokeWidth="1.5" fill={GREEN} fillOpacity="0.08" strokeLinejoin="round" />
      <path d="M20 34 C20 37 22 40 24 40 C26 40 28 37 28 34" stroke={GREEN} strokeWidth="1.5" fill="none" />
      <circle cx="34" cy="12" r="5" fill={GREEN} />
      <text x="34" y="15" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">!</text>
    </svg>
  );
}

export function DeadStockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <rect x="8" y="14" width="32" height="26" rx="4" stroke={GREEN} strokeWidth="1.5" fill={GREEN} fillOpacity="0.08" />
      <path d="M8 22 L40 22" stroke={GREEN} strokeWidth="1.5" />
      <path d="M18 28 L30 40 M30 28 L18 40" stroke={GREEN} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ParetoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <circle cx="24" cy="24" r="18" stroke={GREEN} strokeWidth="1.5" fill={GREEN} fillOpacity="0.08" />
      <path d="M24 24 L24 6 A18 18 0 1 1 9.5 37Z" fill={GREEN} fillOpacity="0.25" />
      <path d="M24 24 L9.5 37 A18 18 0 0 1 24 6Z" fill={GREEN} />
    </svg>
  );
}

export function AIChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <rect x="6" y="8" width="36" height="26" rx="6" stroke={GREEN} strokeWidth="1.5" fill={GREEN} fillOpacity="0.08" />
      <polygon points="16,34 22,34 18,42" fill={GREEN} fillOpacity="0.08" stroke={GREEN} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M30 16 L32 20 L36 18 L32 22 L34 26 L30 22 L26 24 L30 20Z" fill={GREEN} />
      <line x1="14" y1="18" x2="26" y2="18" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="24" x2="22" y2="24" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
