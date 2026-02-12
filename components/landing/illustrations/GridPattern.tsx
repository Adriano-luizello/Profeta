"use client";

export function GridPattern({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 10 }).map((_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={col * 44 + 22}
            cy={row * 44 + 22}
            r="1.5"
            fill="#52796A"
            fillOpacity="0.15"
          />
        ))
      )}
    </svg>
  );
}
