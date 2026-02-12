"use client";

import { cn } from "@/lib/utils";

export type BadgeVariant = "critical" | "attention" | "ok" | "info";

const variantStyles: Record<
  BadgeVariant,
  { dot: string; text: string }
> = {
  critical: {
    dot: "bg-profeta-red",
    text: "text-profeta-text-primary",
  },
  attention: {
    dot: "bg-profeta-amber",
    text: "text-profeta-text-primary",
  },
  ok: {
    dot: "bg-profeta-green",
    text: "text-profeta-text-primary",
  },
  info: {
    dot: "bg-profeta-green",
    text: "text-profeta-text-primary",
  },
};

export interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  pulse?: boolean;
  className?: string;
}

export function Badge({
  label,
  variant,
  pulse = false,
  className,
}: BadgeProps) {
  const styles = variantStyles[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-badge border border-profeta-border bg-profeta-card px-2.5 py-1 text-xs font-medium",
        styles.text,
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          styles.dot,
          pulse && "animate-dot-pulse"
        )}
      />
      {label}
    </span>
  );
}
