"use client";

import Image from "next/image";

interface ProfetaLogoProps {
  size?: number;
  variant?: "default" | "white" | "light";
}

export function ProfetaLogo({
  size = 34,
  variant = "default",
}: ProfetaLogoProps) {
  const isLight = variant === "light";
  const boxClass =
    variant === "default"
      ? "bg-profeta-green"
      : isLight
        ? "bg-transparent"
        : "bg-white/10";
  const imgClass =
    variant === "default" || isLight ? "invert" : "";

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.29,
        overflow: "hidden",
        flexShrink: 0,
      }}
      className={boxClass}
    >
      <div className="flex h-full w-full items-center justify-center p-[18%]">
        <Image
          src="/profeta-icon.svg"
          alt="Profeta"
          width={size}
          height={size}
          unoptimized
          className={imgClass}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    </div>
  );
}
