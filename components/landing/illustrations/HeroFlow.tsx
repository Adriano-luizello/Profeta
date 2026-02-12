"use client";

export function HeroFlow() {
  return (
    <svg
      viewBox="0 0 480 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-md"
      aria-hidden
    >
      {/* Bloco 1 — Dados */}
      <rect
        x="0"
        y="50"
        width="120"
        height="100"
        rx="16"
        fill="#52796A"
        fillOpacity="0.08"
        stroke="#52796A"
        strokeWidth="1.5"
      />
      <rect x="40" y="72" width="8" height="30" rx="2" fill="#52796A" fillOpacity="0.3" />
      <rect x="52" y="62" width="8" height="40" rx="2" fill="#52796A" fillOpacity="0.5" />
      <rect x="64" y="76" width="8" height="26" rx="2" fill="#52796A" fillOpacity="0.3" />
      <text x="60" y="125" textAnchor="middle" fill="#1A1A1A" fontSize="12" fontWeight="500">
        Seus dados
      </text>

      {/* Seta 1 */}
      <line x1="130" y1="100" x2="168" y2="100" stroke="#52796A" strokeWidth="1.5" strokeDasharray="4 4" />
      <polygon points="170,95 180,100 170,105" fill="#52796A" />

      {/* Bloco 2 — Profeta (destaque) */}
      <rect
        x="180"
        y="40"
        width="120"
        height="120"
        rx="16"
        fill="#52796A"
        stroke="#52796A"
        strokeWidth="1.5"
      />
      <circle cx="240" cy="85" r="18" fill="none" stroke="white" strokeWidth="1.5" />
      <path d="M232 85 Q240 70 248 85 Q240 100 232 85" stroke="white" strokeWidth="1.5" fill="none" />
      <text x="240" y="125" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">
        Profeta IA
      </text>

      {/* Seta 2 */}
      <line x1="310" y1="100" x2="348" y2="100" stroke="#52796A" strokeWidth="1.5" strokeDasharray="4 4" />
      <polygon points="350,95 360,100 350,105" fill="#52796A" />

      {/* Bloco 3 — Ação */}
      <rect
        x="360"
        y="50"
        width="120"
        height="100"
        rx="16"
        fill="#52796A"
        fillOpacity="0.08"
        stroke="#52796A"
        strokeWidth="1.5"
      />
      <circle cx="420" cy="85" r="14" fill="#52796A" fillOpacity="0.15" />
      <polyline
        points="412,85 418,91 428,79"
        stroke="#52796A"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x="420" y="125" textAnchor="middle" fill="#1A1A1A" fontSize="12" fontWeight="500">
        Decisão
      </text>
    </svg>
  );
}
