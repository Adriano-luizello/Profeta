"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";
import { CSSProperties, ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  duration?: number;
  className?: string;
}

export function Reveal({
  children,
  delay = 0,
  direction = "up",
  distance = 30,
  duration = 700,
  className = "",
}: RevealProps) {
  const { ref, isVisible } = useScrollReveal();

  const transforms = {
    up: `translateY(${distance}px)`,
    down: `translateY(-${distance}px)`,
    left: `translateX(${distance}px)`,
    right: `translateX(-${distance}px)`,
  };

  const style: CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "translate(0)" : transforms[direction],
    transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    willChange: isVisible ? "auto" : "opacity, transform",
  };

  return (
    <div ref={ref} style={style} className={className}>
      {children}
    </div>
  );
}
