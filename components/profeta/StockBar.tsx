"use client";

import { cn } from "@/lib/utils";

export type StockBarStatus = "critical" | "attention" | "comfortable";

const statusColors: Record<StockBarStatus, string> = {
  critical: "bg-profeta-red",
  attention: "bg-profeta-amber",
  comfortable: "bg-profeta-green",
};

export interface StockBarProps {
  current: number;
  max: number;
  status: StockBarStatus;
  className?: string;
}

export function StockBar({
  current,
  max,
  status,
  className,
}: StockBarProps) {
  const percentage = max > 0 ? Math.min(100, (current / max) * 100) : 0;

  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-profeta-elevated",
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300",
          statusColors[status]
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
