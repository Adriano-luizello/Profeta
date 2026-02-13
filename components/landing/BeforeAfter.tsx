"use client";

import { useId } from "react";
import { useLocale } from "@/lib/locale-context";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { Reveal } from "./Reveal";

const pains = [
  { key: "pain_1", subKey: "pain_1_sub" },
  { key: "pain_2", subKey: "pain_2_sub" },
  { key: "pain_3", subKey: "pain_3_sub" },
  { key: "pain_4", subKey: "pain_4_sub" },
  { key: "pain_5", subKey: "pain_5_sub" },
] as const;

const benefits = [
  { key: "benefit_1", subKey: "benefit_1_sub" },
  { key: "benefit_2", subKey: "benefit_2_sub" },
  { key: "benefit_3", subKey: "benefit_3_sub" },
  { key: "benefit_4", subKey: "benefit_4_sub" },
  { key: "benefit_5", subKey: "benefit_5_sub" },
] as const;

function PainIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="9" fill="rgba(220, 38, 38, 0.1)" />
      <path
        d="M6.5 6.5L11.5 11.5M11.5 6.5L6.5 11.5"
        stroke="#DC2626"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BenefitIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="9" fill="rgba(82, 121, 106, 0.08)" />
      <path
        d="M5.5 9L8 11.5L12.5 6.5"
        stroke="#52796A"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BeforeAfter() {
  const uid = useId().replace(/:/g, "");
  const { t } = useLocale();
  const { ref, isVisible } = useScrollReveal(0.1);

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-profeta-surface">
      <div className="max-w-[1080px] mx-auto">
        <Reveal className="text-center mb-12">
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "#52796A" }}
          >
            {t.beforeAfter.label}
          </p>
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl text-profeta-primary leading-tight">
            {t.beforeAfter.title_line1}
            <br />
            <span style={{ color: "#52796A" }}>{t.beforeAfter.title_line2}</span>
          </h2>
        </Reveal>

        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden shadow-lg"
          style={{ boxShadow: "0 4px 40px rgba(0,0,0,0.1)" }}
        >
          {/* Lado esquerdo — Sem Profeta (DARK) */}
          <div
            className="p-6 md:p-8 lg:p-10"
            style={{ backgroundColor: "#212528" }}
          >
            <div
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full mb-7"
              style={{ backgroundColor: "rgba(220,38,38,0.12)" }}
            >
              <AlertTriangle className="w-4 h-4 text-[#F87171]" />
              <span className="text-xs font-semibold text-[#F87171]">
                {t.beforeAfter.badge_before}
              </span>
            </div>
            <div className="space-y-5">
              {pains.map((item, index) => (
                <div
                  key={item.key}
                  className="flex gap-3 items-start"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? "translateX(0)" : "translateX(-12px)",
                    transition: `opacity 0.5s ease ${0.3 + index * 0.1}s, transform 0.5s ease ${0.3 + index * 0.1}s`,
                  }}
                >
                  <span className="flex-shrink-0 mt-0.5">
                    <PainIcon />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#F3F4F6]">
                      {t.beforeAfter[item.key]}
                    </p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      {t.beforeAfter[item.subKey]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div
              className="rounded-xl p-4 mt-8 border"
              style={{
                backgroundColor: "#2A2D31",
                borderColor: "rgba(255,255,255,0.08)",
              }}
              aria-hidden
            >
              <div
                className="flex justify-between items-center mb-3"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transition: `opacity 0.5s ease 0.9s`,
                }}
              >
                <span className="text-xs font-medium text-[#6B7280]">
                  {t.beforeAfter.chart_before_label}
                </span>
                <span className="text-xs font-semibold text-[#DC2626]">
                  {t.beforeAfter.chart_before_tag}
                </span>
              </div>
              <svg
                width="100%"
                height="48"
                viewBox="0 0 280 48"
                preserveAspectRatio="none"
                className="overflow-visible"
              >
                <defs>
                  <linearGradient
                    id={`${uid}-declineGrad`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#DC2626" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#DC2626" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,12 C40,8 60,16 100,20 C140,24 160,18 200,32 C230,40 260,42 280,44"
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="2"
                  strokeOpacity="0.5"
                />
                <path
                  d="M0,12 C40,8 60,16 100,20 C140,24 160,18 200,32 C230,40 260,42 280,44 L280,48 L0,48 Z"
                  fill={`url(#${uid}-declineGrad)`}
                />
              </svg>
              <div
                className="flex justify-between mt-2"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transition: `opacity 0.5s ease 0.9s`,
                }}
              >
                <span className="text-lg font-bold text-[#F87171] font-mono">
                  {t.beforeAfter.chart_before_value}
                </span>
                <span className="text-xs text-[#6B7280]">
                  {t.beforeAfter.chart_before_period}
                </span>
              </div>
            </div>
          </div>

          {/* Lado direito — Com Profeta (LIGHT) */}
          <div
            className="p-6 md:p-8 lg:p-10"
            style={{ backgroundColor: "#FFFFFF" }}
          >
            <div
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full mb-7"
              style={{ backgroundColor: "rgba(82,121,106,0.08)" }}
            >
              <TrendingUp className="w-4 h-4 text-[#52796A]" />
              <span className="text-xs font-semibold text-[#52796A]">
                {t.beforeAfter.badge_after}
              </span>
            </div>
            <div className="space-y-5">
              {benefits.map((item, index) => (
                <div
                  key={item.key}
                  className="flex gap-3 items-start"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? "translateX(0)" : "translateX(12px)",
                    transition: `opacity 0.5s ease ${0.3 + index * 0.1}s, transform 0.5s ease ${0.3 + index * 0.1}s`,
                  }}
                >
                  <span className="flex-shrink-0 mt-0.5">
                    <BenefitIcon />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-profeta-primary">
                      {t.beforeAfter[item.key]}
                    </p>
                    <p className="text-xs text-profeta-secondary mt-0.5">
                      {t.beforeAfter[item.subKey]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div
              className="rounded-xl p-4 mt-8 border border-[#E5E5E5]"
              style={{ backgroundColor: "#F5F5F5" }}
              aria-hidden
            >
              <div
                className="flex justify-between items-center mb-3"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transition: `opacity 0.5s ease 0.9s`,
                }}
              >
                <span className="text-xs font-medium text-profeta-secondary">
                  {t.beforeAfter.chart_after_label}
                </span>
                <span className="text-xs font-semibold text-[#52796A]">
                  {t.beforeAfter.chart_after_tag}
                </span>
              </div>
              <svg
                width="100%"
                height="48"
                viewBox="0 0 280 48"
                preserveAspectRatio="none"
                className="overflow-visible"
              >
                <defs>
                  <linearGradient
                    id={`${uid}-growthGrad`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#52796A" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#52796A" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,40 C30,38 60,36 100,30 C140,24 170,22 200,16 C230,10 255,6 280,4"
                  fill="none"
                  stroke="#52796A"
                  strokeWidth="2"
                  strokeOpacity="0.6"
                />
                <path
                  d="M0,40 C30,38 60,36 100,30 C140,24 170,22 200,16 C230,10 255,6 280,4 L280,48 L0,48 Z"
                  fill={`url(#${uid}-growthGrad)`}
                />
              </svg>
              <div
                className="flex justify-between mt-2"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transition: `opacity 0.5s ease 0.9s`,
                }}
              >
                <span className="text-lg font-bold text-[#52796A] font-mono">
                  {t.beforeAfter.chart_after_value}
                </span>
                <span className="text-xs text-profeta-secondary">
                  {t.beforeAfter.chart_after_period}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Reveal delay={200} threshold={0.1} className="mt-6">
          <p className="text-center text-sm text-profeta-muted">
            {t.beforeAfter.footnote}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
