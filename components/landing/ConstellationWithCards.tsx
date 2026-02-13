"use client";

import { useState, useId, useRef, useCallback } from "react";
import { useLocale } from "@/lib/locale-context";
import {
  LineChart,
  TrendingUp,
  Bell,
  CircleDot,
  Upload,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "./Reveal";

const VB = { w: 1160, h: 560 };
const VB_PADDING_X = 100;
const VB_PADDING_Y = 50;
const CENTER = { x: 580, y: 280 };
const GREEN = "#52796A";
const GREEN_RING_FILL = "rgba(82, 121, 106, 0.1)";
const GREEN_RING_STROKE = "rgba(82, 121, 106, 0.3)";
const STROKE_LINE = "#D1D5DB";
const LABEL_OFFSET = 24;
const CLUSTER_LABEL_OFFSET = 36;
const MUTED = "#6B7280";
const CENTER_RING_R = 50;
const SUB_RADIUS = 90;
const HIT_RADIUS = 44;

type SubNodePolar = { label: string; angleDeg: number; accent?: boolean };

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
      { label: "Lead Time", angleDeg: -30 },
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
      { label: "Prophet", angleDeg: 200 },
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

const intermediateNodes: Array<{ label: string; x: number; y: number }> = [
  { label: "Alertas", x: 580, y: 58 },
  { label: "Pedidos", x: 138, y: 280 },
  { label: "Vendas", x: 1022, y: 280 },
  { label: "Turnover", x: 340, y: 462 },
  { label: "Custo de ruptura", x: 820, y: 462 },
];

function polarToXY(cx: number, cy: number, angleDeg: number, r: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function anchorFromAngle(angleDeg: number): "start" | "middle" | "end" {
  const cos = Math.cos((angleDeg * Math.PI) / 180);
  if (cos > 0.25) return "start";
  if (cos < -0.25) return "end";
  return "middle";
}

function getClusterLabelPosition(nodeX: number): { x: number; anchor: "start" | "middle" | "end" } {
  if (nodeX < CENTER.x) return { x: nodeX + CLUSTER_LABEL_OFFSET, anchor: "start" };
  if (nodeX > CENTER.x) return { x: nodeX - CLUSTER_LABEL_OFFSET, anchor: "end" };
  return { x: nodeX, anchor: "middle" };
}

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

type HoverTarget = {
  id: string;
  cardIndex: number;
  cx: number;
  cy: number;
  label: string;
  isCluster?: boolean;
  /** Onde posicionar o card em relação ao nó: 'right' | 'left' | 'below' | 'above' */
  cardPlacement: "right" | "left" | "below" | "above";
};

const HOVER_TARGETS: HoverTarget[] = [
  { id: "vendas", cardIndex: 0, cx: 1022, cy: 280, label: "Vendas", cardPlacement: "left" },
  { id: "forecast", cardIndex: 1, cx: 1032, cy: 98, label: "Forecast", isCluster: true, cardPlacement: "left" },
  { id: "alertas", cardIndex: 2, cx: 580, cy: 58, label: "Alertas", cardPlacement: "below" },
  { id: "supply", cardIndex: 2, cx: 128, cy: 98, label: "Supply Chain", isCluster: true, cardPlacement: "right" },
  { id: "estoque", cardIndex: 3, cx: 128, cy: 462, label: "Estoque Parado", isCluster: true, cardPlacement: "right" },
  { id: "pareto", cardIndex: 4, cx: 1032, cy: 462, label: "Pareto 80/20", isCluster: true, cardPlacement: "left" },
  { id: "profeta", cardIndex: 5, cx: CENTER.x, cy: CENTER.y, label: "Profeta", cardPlacement: "right" },
];

function getClusterLabelX(cx: number): number {
  if (cx < CENTER.x) return cx + CLUSTER_LABEL_OFFSET;
  if (cx > CENTER.x) return cx - CLUSTER_LABEL_OFFSET;
  return cx;
}

const VB_TOTAL_W = VB.w + 2 * VB_PADDING_X;
const VB_TOTAL_H = VB.h + 2 * VB_PADDING_Y;

const HOVER_LEAVE_DELAY_MS = 120;

function isLineInBranch(
  lineIndex: number,
  activeBranch: string | null
): boolean {
  if (!activeBranch) return false;
  const clusterIdx = clusters.findIndex((c) => c.id === activeBranch);
  if (clusterIdx === -1) return false;

  const linesToClustersCount = clusters.length;
  const linesToIntermediateCount = intermediateNodes.length;
  const subLineStartIdx = linesToClustersCount + linesToIntermediateCount;

  if (lineIndex < linesToClustersCount) {
    return lineIndex === clusterIdx;
  }
  if (lineIndex < subLineStartIdx) return false;

  let subOffset = 0;
  for (let i = 0; i < clusterIdx; i++) {
    subOffset += clusters[i].subNodes.length;
  }
  const cluster = clusters[clusterIdx];
  const subStart = subLineStartIdx + subOffset;
  const subEnd = subStart + cluster.subNodes.length;
  return lineIndex >= subStart && lineIndex < subEnd;
}

export function ConstellationWithCards() {
  const uid = useId().replace(/:/g, "");
  const { t } = useLocale();
  const [hoveredTarget, setHoveredTarget] = useState<HoverTarget | null>(null);
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback((target: HoverTarget) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setHoveredTarget(target);
    if (target.isCluster) {
      setActiveBranch(target.id);
    } else {
      setActiveBranch(null);
    }
  }, []);

  const handleLeave = useCallback(() => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredTarget(null);
      setActiveBranch(null);
      leaveTimeoutRef.current = null;
    }, HOVER_LEAVE_DELAY_MS);
  }, []);

  const cards: Array<{ title: string; desc: string; Icon: LucideIcon }> = [
    { title: t.connected.c1_title, desc: t.connected.c1_desc, Icon: LineChart },
    { title: t.connected.c2_title, desc: t.connected.c2_desc, Icon: TrendingUp },
    { title: t.connected.c3_title, desc: t.connected.c3_desc, Icon: Bell },
    { title: t.connected.c4_title, desc: t.connected.c4_desc, Icon: CircleDot },
    { title: t.connected.c5_title, desc: t.connected.c5_desc, Icon: Upload },
    { title: t.connected.c6_title, desc: t.connected.c6_desc, Icon: MessageCircle },
  ];

  const linesToClusters = clusters.map((c) => {
    const clusterLabelX = getClusterLabelX(c.x);
    const isLeft = c.x < CENTER.x;
    const dotCx = isLeft ? clusterLabelX - 12 : clusterLabelX + 12;
    return shortenLineStart(CENTER.x, CENTER.y, dotCx, c.y, CENTER_RING_R);
  });
  const linesToIntermediate = intermediateNodes.map((n) => {
    const ex = getClusterLabelX(n.x);
    return shortenLineStart(CENTER.x, CENTER.y, ex, n.y, CENTER_RING_R);
  });
  const linesClusterToSub: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  clusters.forEach((c) => {
    const cx = getClusterLabelX(c.x);
    c.subNodes.forEach((s) => {
      const { x: labelX, y: labelY } = polarToXY(c.x, c.y, s.angleDeg, SUB_RADIUS + LABEL_OFFSET);
      linesClusterToSub.push({ x1: cx, y1: c.y, x2: labelX, y2: labelY });
    });
  });
  const allLines = [...linesToClusters, ...linesToIntermediate, ...linesClusterToSub];

  const displayCard = hoveredTarget !== null ? cards[hoveredTarget.cardIndex] : null;

  /** Converte coordenadas viewBox em % para posicionar o card */
  function getCardStyle(target: HoverTarget): React.CSSProperties {
    const leftPct = ((target.cx + VB_PADDING_X) / VB_TOTAL_W) * 100;
    const topPct = ((target.cy + VB_PADDING_Y) / VB_TOTAL_H) * 100;
    const placement = target.cardPlacement;
    const offset = 12;

    const base: React.CSSProperties = {
      position: "absolute",
      left: `${leftPct}%`,
      top: `${topPct}%`,
      zIndex: 20,
      width: 280,
      maxWidth: "min(280px, 90vw)",
      pointerEvents: "none",
      transition: "opacity 0.15s ease-out",
    };

    if (placement === "right") {
      return { ...base, transform: `translate(${offset}px, -50%)` };
    }
    if (placement === "left") {
      return { ...base, transform: `translate(calc(-100% - ${offset}px), -50%)` };
    }
    if (placement === "below") {
      return { ...base, transform: `translate(-50%, ${offset}px)` };
    }
    return { ...base, transform: `translate(-50%, calc(-100% - ${offset}px))` };
  }

  return (
    <section className="relative bg-profeta-surface py-24 md:py-32">
      <style>{`
        @keyframes constellation-line-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes constellation-node-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes constellationRingPulse {
          0%, 100% { opacity: 0.3; transform-origin: center; }
          50% { opacity: 0.12; }
        }
        .constellation-line {
          stroke: ${STROKE_LINE};
          stroke-width: 1.5;
          opacity: 0;
          animation: constellation-line-in 0.4s ease-out forwards;
        }
        .constellation-node {
          opacity: 0;
          animation: constellation-node-in 0.5s ease-out forwards;
        }
        .constellation-hit {
          cursor: pointer;
          fill: transparent;
        }
        .constellation-hit:hover {
          fill: rgba(82, 121, 106, 0.08);
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4">
        <Reveal className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-display text-3xl md:text-4xl text-profeta-primary">
            {t.connected.title}
          </h2>
          <p className="mt-4 text-lg text-profeta-secondary">
            {t.connected.subtitle}
          </p>
        </Reveal>

        <div className="relative w-full flex justify-center">
          {/* Constellation — maior, mesmo aspect-ratio do viewBox para card alinhar */}
          <div
            className="relative w-full max-w-[1280px] mx-auto"
            style={{
              aspectRatio: `${VB_TOTAL_W} / ${VB_TOTAL_H}`,
              minHeight: 500,
            }}
          >
            <svg
              viewBox={`${-VB_PADDING_X} ${-VB_PADDING_Y} ${VB_TOTAL_W} ${VB_TOTAL_H}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full absolute inset-0"
              role="img"
              aria-label="Mapa mental Profeta: passe o mouse para explorar"
            >
              <defs>
                <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.08" />
                </filter>
              </defs>

              <g>
                {allLines.map((line, i) => {
                  const inBranch = isLineInBranch(i, activeBranch);
                  return (
                    <line
                      key={i}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke={activeBranch ? (inBranch ? GREEN : STROKE_LINE) : undefined}
                      strokeWidth={activeBranch ? (inBranch ? 2 : 1.5) : undefined}
                      className={!activeBranch ? "constellation-line" : undefined}
                      style={{
                        animationDelay: !activeBranch ? `${0.3 + i * 0.04}s` : undefined,
                        transition:
                          activeBranch !== null
                            ? "stroke 0.25s ease, stroke-width 0.25s ease, opacity 0.25s ease"
                            : undefined,
                        opacity: activeBranch !== null ? (inBranch ? 0.85 : 0.08) : undefined,
                      }}
                    />
                  );
                })}
              </g>

              {/* Center: Profeta — sempre opacity 1 */}
              <g
                className="constellation-node"
                style={{
                  animationDelay: "0.5s",
                  opacity: 1,
                  transition: activeBranch !== null ? "opacity 0.25s ease" : undefined,
                }}
              >
                <circle
                  cx={CENTER.x}
                  cy={CENTER.y}
                  r={HIT_RADIUS}
                  className="constellation-hit"
                  onMouseEnter={() => handleEnter(HOVER_TARGETS.find((h) => h.id === "profeta")!)}
                  onMouseLeave={handleLeave}
                  onClick={() =>
                    setHoveredTarget((prev) =>
                      prev?.id === "profeta" ? null : HOVER_TARGETS.find((h) => h.id === "profeta")!
                    )
                  }
                />
                <circle
                  cx={CENTER.x}
                  cy={CENTER.y}
                  r={50}
                  fill={GREEN_RING_FILL}
                  stroke={GREEN_RING_STROKE}
                  strokeWidth={1.5}
                />
                <circle cx={CENTER.x} cy={CENTER.y} r={38} fill={GREEN} filter={`url(#${uid}-shadow)`} />
                <image
                  href="/profeta-icon.svg"
                  x={CENTER.x - 22}
                  y={CENTER.y - 22}
                  width={44}
                  height={44}
                  style={{ filter: "brightness(0) invert(1)" }}
                  preserveAspectRatio="xMidYMid meet"
                />
              </g>

              {intermediateNodes.map((n, i) => {
                const labelX = getClusterLabelX(n.x);
                const anchor = n.x < CENTER.x ? "start" : n.x > CENTER.x ? "end" : "middle";
                const target = HOVER_TARGETS.find(
                  (h) => h.label === n.label && h.cx === n.x && h.cy === n.y
                );
                const nodeOpacity =
                  activeBranch !== null ? 0.15 : undefined;
                return (
                  <g
                    key={n.label}
                    className="constellation-node"
                    style={{
                      animationDelay: `${0.5 + (i + 1) * 0.05}s`,
                      opacity: nodeOpacity,
                      transition: activeBranch !== null ? "opacity 0.25s ease" : undefined,
                    }}
                  >
                    {target && (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={HIT_RADIUS}
                        className="constellation-hit"
                        onMouseEnter={() => handleEnter(target)}
                        onMouseLeave={handleLeave}
                        onClick={() =>
                          setHoveredTarget((prev) =>
                            prev?.id === target.id ? null : target
                          )
                        }
                      />
                    )}
                    <text
                      x={labelX}
                      y={n.y}
                      textAnchor={anchor}
                      dominantBaseline="central"
                      fill="#111"
                      fontSize={16}
                      fontWeight="bold"
                    >
                      {n.label}
                    </text>
                  </g>
                );
              })}

              {clusters.map((c, clusterIndex) => {
                const { x: clusterLabelX, anchor: clusterLabelAnchor } = getClusterLabelPosition(c.x);
                const target = HOVER_TARGETS.find(
                  (h) => h.id === c.id && h.isCluster
                );
                const isInActiveBranch = activeBranch === c.id;
                const clusterNodeOpacity =
                  activeBranch !== null ? (isInActiveBranch ? 1 : 0.1) : undefined;
                return (
                  <g key={c.id}>
                    <g
                      className="constellation-node"
                      style={{
                        animationDelay: `${0.5 + (clusterIndex + 6) * 0.05}s`,
                        opacity: clusterNodeOpacity,
                        transition: activeBranch !== null ? "opacity 0.25s ease" : undefined,
                      }}
                    >
                      {target && (
                        <circle
                          cx={c.x}
                          cy={c.y}
                          r={HIT_RADIUS}
                          className="constellation-hit"
                          onMouseEnter={() => handleEnter(target)}
                          onMouseLeave={handleLeave}
                          onClick={() =>
                            setHoveredTarget((prev) =>
                              prev?.id === target.id ? null : target
                            )
                          }
                        />
                      )}
                      {(() => {
                        const isLeft = c.x < CENTER.x;
                        const dotCx = isLeft ? clusterLabelX - 12 : clusterLabelX + 12;
                        const isActive = activeBranch === c.id;
                        return (
                          <>
                            <circle
                              cx={dotCx}
                              cy={c.y}
                              r={isActive ? 7 : 5}
                              fill={GREEN}
                              style={{ transition: "r 0.25s ease" }}
                            />
                            {isActive && (
                              <circle
                                cx={dotCx}
                                cy={c.y}
                                r={16}
                                fill="transparent"
                                stroke={GREEN}
                                strokeWidth={1.5}
                                opacity={0.3}
                                style={{ animation: "constellationRingPulse 2s ease-in-out infinite" }}
                              />
                            )}
                          </>
                        );
                      })()}
                      <text
                        x={clusterLabelX}
                        y={c.y}
                        textAnchor={clusterLabelAnchor}
                        dominantBaseline="central"
                        fill={isInActiveBranch ? GREEN : "#111"}
                        fontSize={16}
                        fontWeight={isInActiveBranch ? 700 : 600}
                        style={{ transition: "fill 0.25s ease" }}
                      >
                        {c.label}
                      </text>
                    </g>
                    {c.subNodes.map((s, subIndex) => {
                      const animIndex = 5 + clusterIndex * 2 + 1 + subIndex;
                      const rad = (s.angleDeg * Math.PI) / 180;
                      const { x: labelX, y: labelY } = polarToXY(
                        c.x,
                        c.y,
                        s.angleDeg,
                        SUB_RADIUS + LABEL_OFFSET
                      );
                      const textOffset = 8;
                      const textX = labelX + textOffset * Math.cos(rad);
                      const textY = labelY + textOffset * Math.sin(rad);
                      const subIsInActiveBranch = activeBranch === c.id;
                      const subNodeOpacity =
                        activeBranch !== null ? (subIsInActiveBranch ? 1 : 0.1) : undefined;
                      const subDotFill =
                        s.accent ? GREEN : subIsInActiveBranch ? GREEN : "#D1D5DB";
                      const subTextFill =
                        s.accent ? GREEN : subIsInActiveBranch ? GREEN : MUTED;
                      return (
                        <g
                          key={s.label}
                          className="constellation-node"
                          style={{
                            animationDelay: `${0.5 + animIndex * 0.05}s`,
                            opacity: subNodeOpacity,
                            transition: activeBranch !== null ? "opacity 0.25s ease" : undefined,
                          }}
                        >
                          {target && (
                            <circle
                              cx={labelX}
                              cy={labelY}
                              r={HIT_RADIUS}
                              className="constellation-hit"
                              onMouseEnter={() => handleEnter(target)}
                              onMouseLeave={handleLeave}
                            />
                          )}
                          <circle
                            cx={labelX}
                            cy={labelY}
                            r={subIsInActiveBranch ? 3.5 : 2.5}
                            fill={subDotFill}
                            style={{ transition: "r 0.25s ease, fill 0.25s ease" }}
                          />
                          <text
                            x={textX}
                            y={textY}
                            textAnchor={anchorFromAngle(s.angleDeg)}
                            dominantBaseline="central"
                            fill={subTextFill}
                            fontSize={13}
                            fontWeight={s.accent ? 600 : 400}
                            style={{ transition: "fill 0.25s ease" }}
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

            {/* Card flutuante — aparece perto do cluster no hover */}
            {displayCard && hoveredTarget && (
              <div
                className="rounded-2xl border p-5 shadow-lg"
                style={{
                  ...getCardStyle(hoveredTarget),
                  backgroundColor: "#F5F5F5",
                  borderColor: "#E5E5E5",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{
                    backgroundColor: "white",
                    border: "1px solid #E5E5E5",
                  }}
                >
                  <displayCard.Icon
                    className="w-5 h-5 shrink-0 text-[#52796A]"
                    strokeWidth={2}
                  />
                </div>
                <h3
                  className="font-bold text-profeta-primary mb-1.5"
                  style={{ fontSize: 14 }}
                >
                  {displayCard.title}
                </h3>
                <p
                  className="text-profeta-secondary leading-relaxed"
                  style={{ fontSize: 12 }}
                >
                  {displayCard.desc}
                </p>
              </div>
            )}
          </div>

        </div>

        <Reveal delay={200} threshold={0.1} className="mt-6">
          {/* Legenda navegável */}
          <div className="flex justify-center flex-wrap gap-2 md:gap-6 mb-4">
            {clusters.map((c) => {
              const isActive = activeBranch === c.id;
              const target = HOVER_TARGETS.find((h) => h.id === c.id && h.isCluster);
              return (
                <button
                  key={c.id}
                  type="button"
                  onMouseEnter={() => {
                    if (target) handleEnter(target);
                  }}
                  onMouseLeave={handleLeave}
                  onClick={() => {
                    if (target) {
                      setHoveredTarget((prev) => (prev?.id === target.id ? null : target));
                      setActiveBranch((prev) => (prev === c.id ? null : c.id));
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200"
                  style={{
                    background: isActive ? "rgba(82, 121, 106, 0.08)" : "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <span
                    className="rounded-full flex-shrink-0 transition-all duration-200"
                    style={{
                      width: 8,
                      height: 8,
                      backgroundColor: isActive ? "#52796A" : "#D1D5DB",
                    }}
                  />
                  <span
                    className="text-sm font-medium transition-colors duration-200"
                    style={{
                      color: isActive ? "#52796A" : "#6B7280",
                      fontSize: 13,
                    }}
                  >
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Texto de instrução */}
          <p
            className="text-center text-profeta-muted"
            style={{ fontSize: 13 }}
          >
            Passe o mouse sobre os pontos para explorar
          </p>
          <p
            className="text-center text-profeta-secondary italic"
            style={{ fontSize: 12 }}
          >
            {t.connected.footnote}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
