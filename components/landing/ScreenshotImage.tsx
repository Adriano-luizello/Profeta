"use client";

import { useState } from "react";
import Image from "next/image";

interface ScreenshotImageProps {
  /** Caminho da imagem em public/ (ex: /landing/hero.png) */
  src: string;
  alt: string;
  /** Conteúdo exibido quando a imagem não existe ou falha ao carregar */
  placeholder: React.ReactNode;
  className?: string;
  /** Classes do container da imagem (ex: aspect-video, rounded-2xl) */
  imageClassName?: string;
  /** Atributo sizes do Next/Image para otimização (ex: "(max-width: 1024px) 100vw, 880px") */
  sizes?: string;
}

/**
 * Exibe imagem da plataforma na landing. Se o arquivo não existir em public/,
 * mostra o placeholder. Adicione as imagens em public/landing/ — veja
 * public/landing/README.md para como gerar os screenshots.
 */
export function ScreenshotImage({
  src,
  alt,
  placeholder,
  className = "",
  imageClassName = "",
  sizes = "(max-width: 1024px) 100vw, 672px",
}: ScreenshotImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return <div className={className}>{placeholder}</div>;
  }

  return (
    <div className={`relative aspect-video overflow-hidden rounded-2xl border border-profeta-border shadow-2xl bg-profeta-surface ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={`object-contain ${imageClassName}`}
        onError={() => setError(true)}
      />
    </div>
  );
}
