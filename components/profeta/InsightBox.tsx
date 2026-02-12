"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type InsightBoxVariant = "green" | "amber" | "red";

const variantStyles: Record<
  InsightBoxVariant,
  { bg: string; border: string }
> = {
  green: {
    bg: "bg-profeta-green/10",
    border: "border-profeta-green/30",
  },
  amber: {
    bg: "bg-profeta-amber/10",
    border: "border-profeta-amber/30",
  },
  red: {
    bg: "bg-profeta-red/10",
    border: "border-profeta-red/30",
  },
};

export interface InsightBoxProps {
  icon?: string;
  title?: string;
  description: string;
  variant: InsightBoxVariant;
  actions?: ReactNode;
  className?: string;
}

export function InsightBox({
  icon,
  title,
  description,
  variant,
  actions,
  className,
}: InsightBoxProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "rounded-component border p-4",
        styles.bg,
        styles.border,
        className
      )}
    >
      <div className="flex gap-3">
        {icon && (
          <span className=" shrink-0 text-lg" role="img" aria-hidden>
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {title && (
            <p className="mb-0.5 text-sm font-semibold text-profeta-text-primary">
              {title}
            </p>
          )}
          <p className="text-sm text-profeta-text-secondary">{description}</p>
          {actions && (
            <div className="mt-3 flex items-center gap-2">{actions}</div>
          )}
        </div>
      </div>
    </div>
  );
}
