"use client";

import { useId } from "react";

const VB = { w: 1160, h: 560 };
const VB_PADDING_X = 100; // padding L/R no viewBox para não cortar labels nas laterais
const VB_PADDING_Y = 25; // padding top/bottom
const CENTER = { x: 580, y: 280 };
const GREEN = "#52796A";
const GREEN_RING_FILL = "rgba(82, 121, 106, 0.1)";
const GREEN_RING_STROKE = "rgba(82, 121, 106, 0.3)";
const STROKE_LINE = "#D1D5DB";
/** Distância do "nó" ao label (estilo referência: linha termina no texto, sem dot) */
const LABEL_OFFSET = 18;
const CLUSTER_LABEL_OFFSET = 28;
const MUTED = "#6B7280";
const CENTER_RING_R = 40;
/** Raio dos sub-nós em volta do cluster (360°) — compacto para não cortar nas laterais */
const SUB_RADIUS = 72;

type SubNodePolar = { label: string; angleDeg: number; accent?: boolean };

/**
 * Galhos bem espalhados: clusters nos cantos, intermediários nas bordas.
 * Formato de moldura/retângulo, não círculo.
 */
const clusters: Array<{
  id: string;
  label: string;
  x: number;
  y: number;
  subNodes: SubNodePolar[];
}> = [
  {
    id: "supply",
    label: "Supply Chain",
    x: 128,
    y: 98,
    subNodes: [
      { label: "Reorder Point", angleDeg: -90, accent: true },
      { label: "Lead Time", angleDeg: 28 },
      { label: "MOQ", angleDeg: 90 },
      { label: "Fornecedores", angleDeg: 180 },
    ],
  },
  {
    id: "forecast",
    label: "Forecast",
    x: 1032,
    y: 98,
    subNodes: [
      { label: "Sazonalidade", angleDeg: -90, accent: true },
      { label: "Tendências", angleDeg: 0 },
      { label: "XGBoost", angleDeg: 90 },
      { label: "Prophet", angleDeg: 152 },
    ],
  },
  {
    id: "estoque",
    label: "Estoque Parado",
    x: 128,
    y: 462,
    subNodes: [
      { label: "Stop Loss", angleDeg: -90, accent: true },
      { label: "Custo oculto", angleDeg: 30 },
      { label: "Promoções", angleDeg: 150 },
    ],
  },
  {
    id: "pareto",
    label: "Pareto 80/20",
    x: 1032,
    y: 462,
    subNodes: [
      { label: "Top Performers", angleDeg: -90, accent: true },
      { label: "Categorias", angleDeg: 30 },
      { label: "Rentabilidade", angleDeg: 150 },
    ],
  },
];

/** Converte ângulo (graus) + raio em (x, y). 0° = direita, 90° = baixo (eixo y para baixo). */
function polarToXY(cx: number, cy: number, angleDeg: number, r: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Anchor do texto a partir do ângulo (label para fora do cluster). */
function anchorFromAngle(angleDeg: number): "start" | "middle" | "end" {
  const cos = Math.cos((angleDeg * Math.PI) / 180);
  if (cos > 0.25) return "start";
  if (cos < -0.25) return "end";
  return "middle";
}

/** Nós intermediários: colados nas bordas (topo, esquerda, direita, base) para quebrar o círculo */
const intermediateNodes: Array<{ label: string; x: number; y: number }> = [
  { label: "Alertas", x: 580, y: 58 },
  { label: "Pedidos", x: 138, y: 280 },
  { label: "Vendas", x: 1022, y: 280 },
  { label: "Turnover", x: 255, y: 462 },
  { label: "Custo de ruptura", x: 905, y: 462 },
];

function getTextAnchor(x: number): "start" | "middle" | "end" {
  if (x < 100) return "start";
  if (x > VB.w - 100) return "end";
  return "middle";
}

function getLabelDx(x: number): number {
  if (x < 100) return LABEL_OFFSET;
  if (x > VB.w - 100) return -LABEL_OFFSET;
  return 0;
}

/** Posição do label (estilo referência: texto é o nó, linha chega até o texto) */
function getClusterLabelPosition(nodeX: number): { x: number; anchor: "start" | "middle" | "end" } {
  if (nodeX < CENTER.x) return { x: nodeX + CLUSTER_LABEL_OFFSET, anchor: "start" };
  if (nodeX > CENTER.x) return { x: nodeX - CLUSTER_LABEL_OFFSET, anchor: "end" };
  return { x: nodeX, anchor: "middle" };
}

/** Encurta o segmento no início (x1,y1) para a linha começar na borda do círculo central */
function shortenLineStart(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  by: number
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return { x1: x1 + ux * by, y1: y1 + uy * by, x2, y2 };
}

export function ConstellationMindMap() {
  const uid = useId().replace(/:/g, "");

  // Linhas terminam nos labels (estilo referência: sem dots nos nós). Do centro: linha começa na borda do círculo.
  const linesToClusters = clusters.map((c) => {
    const { x: ex } = getClusterLabelPosition(c.x);
    const seg = shortenLineStart(CENTER.x, CENTER.y, ex, c.y, CENTER_RING_R);
    return seg;
  });
  const linesToIntermediate = intermediateNodes.map((n) => {
    const { x: ex } = getClusterLabelPosition(n.x);
    return shortenLineStart(CENTER.x, CENTER.y, ex, n.y, CENTER_RING_R);
  });
  const linesClusterToSub: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  clusters.forEach((c) => {
    const { x: cx } = getClusterLabelPosition(c.x);
    c.subNodes.forEach((s) => {
      const { x: labelX, y: labelY } = polarToXY(
        c.x,
        c.y,
        s.angleDeg,
        SUB_RADIUS + LABEL_OFFSET
      );
      linesClusterToSub.push({ x1: cx, y1: c.y, x2: labelX, y2: labelY });
    });
  });
  const allLines = [...linesToClusters, ...linesToIntermediate, ...linesClusterToSub];

  return (
    <section
      className="relative flex items-center justify-center overflow-hidden bg-profeta-surface py-24 md:py-32"
      aria-hidden
    >
      <style>{`
        @keyframes constellation-line-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes constellation-node-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .constellation-line {
          stroke: ${STROKE_LINE};
          stroke-width: 1;
          opacity: 0;
          animation: constellation-line-in 0.4s ease-out forwards;
        }
        .constellation-node {
          opacity: 0;
          animation: constellation-node-in 0.5s ease-out forwards;
        }
      `}</style>
      <div className="w-full max-w-[1160px] mx-auto px-4 flex items-center justify-center" style={{ minHeight: 560, height: "clamp(520px, 70vh, 680px)" }}>
        <svg
          viewBox={`${-VB_PADDING_X} ${-VB_PADDING_Y} ${VB.w + 2 * VB_PADDING_X} ${VB.h + 2 * VB_PADDING_Y}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
          role="img"
          aria-label="Mapa mental Profeta: Supply Chain, Forecast, Estoque Parado, Pareto"
        >
          <defs>
            <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.08" />
            </filter>
          </defs>

          {/* Lines (draw first so they sit under nodes) */}
          <g>
            {allLines.map((line, i) => (
              <line
                key={i}
                className="constellation-line"
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                style={{
                  animationDelay: `${0.3 + i * 0.04}s`,
                }}
              />
            ))}
          </g>

          {/* Center: Profeta */}
          <g className="constellation-node" style={{ animationDelay: "0.5s" }}>
            <circle
              cx={CENTER.x}
              cy={CENTER.y}
              r={40}
              fill={GREEN_RING_FILL}
              stroke={GREEN_RING_STROKE}
              strokeWidth={1.5}
            />
            <circle cx={CENTER.x} cy={CENTER.y} r={32} fill={GREEN} filter={`url(#${uid}-shadow)`} />
            <text
              x={CENTER.x}
              y={CENTER.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={18}
              fontWeight="bold"
              className="font-display"
            >
              Profeta
            </text>
          </g>

          {/* Nós intermediários: só label (linha termina no texto, estilo referência) */}
          {intermediateNodes.map((n, i) => {
            const { x: labelX, anchor } = getClusterLabelPosition(n.x);
            return (
              <g
                key={n.label}
                className="constellation-node"
                style={{ animationDelay: `${0.5 + (i + 1) * 0.05}s` }}
              >
                <text
                  x={labelX}
                  y={n.y}
                  textAnchor={anchor}
                  dominantBaseline="central"
                  fill="#111"
                  fontSize={14}
                  fontWeight="bold"
                >
                  {n.label}
                </text>
              </g>
            );
          })}

          {/* Clusters: só label (linha termina no texto). Sub-nós: label apenas, accent com underline */}
          {clusters.map((c, clusterIndex) => {
            const nodeIndexOffset = 5 + clusterIndex * 2;
            const { x: clusterLabelX, anchor: clusterLabelAnchor } = getClusterLabelPosition(c.x);
            return (
              <g key={c.id}>
                <g
                  className="constellation-node"
                  style={{ animationDelay: `${0.5 + (clusterIndex + 6) * 0.05}s` }}
                >
                  <text
                    x={clusterLabelX}
                    y={c.y}
                    textAnchor={clusterLabelAnchor}
                    dominantBaseline="central"
                    fill="#111"
                    fontSize={14}
                    fontWeight="bold"
                  >
                    {c.label}
                  </text>
                </g>
                {c.subNodes.map((s, subIndex) => {
                  const animIndex = nodeIndexOffset + 1 + subIndex;
                  const { x: sx, y: sy } = polarToXY(c.x, c.y, s.angleDeg, SUB_RADIUS);
                  const { x: labelX, y: labelY } = polarToXY(
                    c.x,
                    c.y,
                    s.angleDeg,
                    SUB_RADIUS + LABEL_OFFSET
                  );
                  return (
                    <g
                      key={s.label}
                      className="constellation-node"
                      style={{ animationDelay: `${0.5 + animIndex * 0.05}s` }}
                    >
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor={anchorFromAngle(s.angleDeg)}
                        dominantBaseline="central"
                        fill={s.accent ? GREEN : MUTED}
                        fontSize={11.5}
                        fontWeight={s.accent ? 600 : 400}
                        style={{ textDecoration: s.accent ? "underline" : undefined }}
                      >
                        {s.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
