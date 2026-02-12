"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface KPICardProps {
  label: string;
  value: string;
  trend?: number;
  sub?: string;
  subColor?: string;
  icon: ReactNode;
  accentBg?: string;
  accentColor?: string;
  className?: string;
}

export function KPICard({
  label,
  value,
  trend,
  sub,
  subColor = "profeta-text-secondary",
  icon,
  accentBg = "profeta-elevated",
  accentColor = "profeta-text-primary",
  className,
}: KPICardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-profeta-border bg-profeta-card p-4 shadow-card",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-profeta-text-muted">
            {label}
          </p>
          <p className="mt-1 font-mono text-[28px] font-bold leading-tight text-profeta-text-primary">
            {value}
          </p>
          {trend !== undefined && (
            <div
              className={cn(
                "mt-1 flex items-center gap-1 font-mono text-sm",
                trend >= 0 ? "text-profeta-green" : "text-profeta-red"
              )}
            >
              {trend >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span>{trend >= 0 ? "+" : ""}{trend}%</span>
            </div>
          )}
          {sub && (
            <p className={cn("mt-0.5 text-[11px]", subColor)}>{sub}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-component",
            accentBg,
            accentColor
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
