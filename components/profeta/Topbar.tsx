"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TopbarProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  className?: string;
}

export function Topbar({ title, subtitle, actions, className }: TopbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 border-b border-profeta-border bg-profeta-bg/80 backdrop-blur-md",
        className
      )}
    >
      <div className="mx-auto max-w-[1300px] px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-profeta-text-primary">
              {title}
            </h1>
            <p className="text-[13px] text-profeta-text-muted">{subtitle}</p>
          </div>
          {actions && (
            <div className="shrink-0 pt-2 sm:pt-0">{actions}</div>
          )}
        </div>
      </div>
    </header>
  );
}
