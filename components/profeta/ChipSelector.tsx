"use client";

import { cn } from "@/lib/utils";

export interface ChipSelectorProps {
  options: string[];
  selected: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ChipSelector({
  options,
  selected,
  onChange,
  className,
}: ChipSelectorProps) {
  return (
    <div
      className={cn(
        "inline-flex gap-0.5 rounded-component bg-profeta-elevated p-0.5",
        className
      )}
      role="group"
      aria-label="Select option"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "rounded-[10px] px-3 py-1.5 text-sm font-medium transition-colors",
            option === selected
              ? "bg-profeta-card text-profeta-text-primary shadow-card"
              : "text-profeta-text-secondary hover:bg-profeta-card/50 hover:text-profeta-text-primary"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
