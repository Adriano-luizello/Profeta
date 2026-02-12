"use client";

interface PeriodSelectorProps {
  value: number;
  onChange: (days: number) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const periods = [
    { label: "30d", value: 30 },
    { label: "60d", value: 60 },
    { label: "90d", value: 90 },
  ];

  return (
    <div className="flex gap-1 rounded-xl bg-profeta-surface p-1">
      {periods.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            value === p.value
              ? "bg-white text-profeta-text-primary shadow-sm"
              : "text-profeta-text-secondary hover:text-profeta-text-primary"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
