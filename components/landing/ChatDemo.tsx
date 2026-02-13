"use client";

import { useLocale } from "@/lib/locale-context";
import { Send } from "lucide-react";
import { ProfetaLogo } from "@/components/profeta/ProfetaLogo";

/** Mensagem exibida quando step >= stepIndex. Anima entrada com transition. */
function ChatMessage({
  children,
  isUser,
  isVisible,
}: {
  children: React.ReactNode;
  isUser: boolean;
  isVisible: boolean;
}) {
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "gap-3"} transition-all duration-500 ease-out`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(12px)",
        pointerEvents: isVisible ? "auto" : "none",
      }}
    >
      {!isUser && (
        <div className="shrink-0">
          <ProfetaLogo size={28} variant="default" />
        </div>
      )}
      <div
        className={`max-w-[85%] ${
          isUser
            ? "rounded-2xl rounded-br-md bg-profeta-green/15 border border-profeta-green/20 px-4 py-3"
            : "flex-1 min-w-0"
        }`}
      >
        {!isUser && (
          <p className="text-[10px] text-profeta-muted mb-1 font-medium">Profeta AI</p>
        )}
        {children}
      </div>
    </div>
  );
}

function BotBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl rounded-tl-md border border-profeta-border bg-white px-4 py-3">
      {children}
    </div>
  );
}

function Badge({
  variant,
  children,
}: {
  variant: "critico" | "atencao" | "ok";
  children: React.ReactNode;
}) {
  const styles = {
    critico:
      "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 [&>.dot]:bg-red-500",
    atencao:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 [&>.dot]:bg-amber-500",
    ok: "bg-profeta-green/15 text-profeta-green border-profeta-green/30 [&>.dot]:bg-profeta-green",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[20px] border px-2 py-0.5 text-[9px] font-bold ${styles[variant]}`}
    >
      <span className="dot h-1 w-1 shrink-0 rounded-full" />
      {children}
    </span>
  );
}

function AlertCard({
  variant,
  title,
  children,
  className = "",
}: {
  variant: "critico" | "atencao" | "ok";
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const borderColors = {
    critico: "border-l-red-500",
    atencao: "border-l-amber-500",
    ok: "border-l-profeta-green",
  };
  const badgeLabels = { critico: "Crítico", atencao: "Atenção", ok: "OK" };
  return (
    <div
      className={`rounded-r-xl border border-t border-r border-b border-profeta-border bg-white pl-4 pr-4 py-3 border-l-4 ${borderColors[variant]} ${className}`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <p className="font-semibold text-profeta-primary text-sm">{title}</p>
        <Badge variant={variant}>{badgeLabels[variant]}</Badge>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "danger";
}) {
  return (
    <div className="inline-flex flex-col rounded-lg border border-profeta-border bg-[#F5F5F5] px-3 py-2">
      <span className="text-[9px] uppercase text-profeta-muted tracking-wide">{label}</span>
      <span
        className={`font-mono text-sm font-bold ${variant === "danger" ? "text-red-600" : "text-profeta-primary"}`}
      >
        {value}
      </span>
    </div>
  );
}

function InsightBox({
  variant,
  title,
  children,
  className = "",
}: {
  variant: "green" | "amber";
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const isGreen = variant === "green";
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${isGreen ? "bg-profeta-green/5 border-profeta-green/20" : "bg-amber-500/5 border-amber-500/20"} ${className}`}
    >
      <p className="text-sm font-semibold text-profeta-primary mb-2">{title}</p>
      <ul className="space-y-1 text-sm text-profeta-secondary">{children}</ul>
    </div>
  );
}

function ParetoBar({ label, name, percent, isVisible }: { label: string; name: string; percent: number; isVisible: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-6 shrink-0 text-xs font-mono text-profeta-muted">{label}</span>
      <span className="min-w-[120px] shrink-0 truncate text-xs text-profeta-primary">{name}</span>
      <div className="flex-1 min-w-0 h-5 rounded bg-profeta-surface overflow-hidden">
        <div
          className="h-full bg-profeta-green rounded transition-all duration-1000 ease-out"
          style={{ width: isVisible ? `${percent}%` : "0%" }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-mono font-bold text-profeta-primary">
        {percent}%
      </span>
    </div>
  );
}

function ParetoChart({ isVisible, labels }: { isVisible: boolean; labels: Record<string, string> }) {
  const rows = [
    { rank: "1", name: labels.pareto1, percent: 28 },
    { rank: "2", name: labels.pareto2, percent: 22 },
    { rank: "3", name: labels.pareto3, percent: 15 },
    { rank: "4", name: labels.pareto4, percent: 5 },
    { rank: "5", name: labels.pareto5, percent: 3 },
  ];
  return (
    <div className="space-y-3 rounded-xl border border-profeta-border bg-white p-4">
      {rows.map((r) => (
        <ParetoBar key={r.rank} label={r.rank} name={r.name} percent={r.percent} isVisible={isVisible} />
      ))}
    </div>
  );
}

/** step 0-6: controla qual mensagem aparece. Scroll na página avança o step. */
export function ChatDemo({ step }: { step: number }) {
  const { t } = useLocale();

  return (
    <div className="w-full max-w-[880px] mx-auto">
      <div
        className="rounded-2xl border border-profeta-border bg-white overflow-hidden"
        style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.1)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-profeta-border px-4 py-3">
          <div className="w-8 h-8 shrink-0 rounded-xl bg-profeta-green flex items-center justify-center">
            <span className="text-sm font-bold text-white">P</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-profeta-primary">Profeta AI</p>
            <p className="text-xs text-profeta-muted flex items-center gap-1.5">
              {t.demo_chat.header_subtitle}
              <span
                className="h-2 w-2 rounded-full bg-profeta-green animate-pulse"
                aria-hidden
              />
            </p>
          </div>
        </div>

        {/* Body — mensagens aparecem conforme step avança com o scroll */}
        <div className="flex flex-col gap-4 p-6">
          <ChatMessage isUser={false} isVisible={step >= 0}>
            <BotBubble>
              <p className="text-sm text-profeta-secondary">{t.demo_chat.bot_intro}</p>
            </BotBubble>
          </ChatMessage>

          <ChatMessage isUser={true} isVisible={step >= 1}>
            {t.demo_chat.user_pedido}
          </ChatMessage>

          <ChatMessage isUser={false} isVisible={step >= 2}>
            <div className="space-y-3">
              <BotBubble>
                <p className="text-sm text-profeta-secondary mb-3">
                  {t.demo_chat.bot_pedido_intro}
                </p>
                <AlertCard variant="critico" title={t.demo_chat.alert1_title}>
                  <div className="flex flex-wrap gap-2">
                    <MetricBox label={t.demo_chat.metric_estoque} value="23un" variant="danger" />
                    <MetricBox label={t.demo_chat.metric_acaba} value="8 dias" variant="danger" />
                    <MetricBox label={t.demo_chat.metric_lead} value="21 dias" variant="danger" />
                    <MetricBox label={t.demo_chat.metric_gap} value="13 dias" variant="danger" />
                  </div>
                </AlertCard>
                <AlertCard variant="atencao" title={t.demo_chat.alert2_title} className="mt-2">
                  <p className="text-xs text-profeta-secondary">{t.demo_chat.alert2_desc}</p>
                </AlertCard>
                <AlertCard variant="ok" title={t.demo_chat.alert3_title} className="mt-2">
                  <p className="text-xs text-profeta-secondary">{t.demo_chat.alert3_desc}</p>
                </AlertCard>
                <InsightBox variant="green" title={t.demo_chat.insight_steps} className="mt-3">
                  <li>• {t.demo_chat.insight_pedir}</li>
                  <li>• {t.demo_chat.insight_negociar}</li>
                  <li>• {t.demo_chat.insight_consolidar}</li>
                </InsightBox>
              </BotBubble>
            </div>
          </ChatMessage>

          <ChatMessage isUser={true} isVisible={step >= 3}>
            {t.demo_chat.user_parados}
          </ChatMessage>

          <ChatMessage isUser={false} isVisible={step >= 4}>
            <div className="space-y-3">
              <BotBubble>
                <p className="text-sm text-profeta-secondary mb-3">{t.demo_chat.bot_parados_intro}</p>
                <AlertCard variant="critico" title={t.demo_chat.alert4_title}>
                  <div className="flex flex-wrap gap-2">
                    <MetricBox label={t.demo_chat.metric_capital} value="R$ 4.920" variant="danger" />
                    <MetricBox label={t.demo_chat.metric_custo_mes} value="R$ 380" variant="danger" />
                  </div>
                </AlertCard>
                <AlertCard variant="atencao" title={t.demo_chat.alert5_title} className="mt-2">
                  <p className="text-xs text-profeta-secondary">{t.demo_chat.alert5_desc}</p>
                </AlertCard>
                <InsightBox variant="amber" title={t.demo_chat.insight_rec} className="mt-3">
                  <li>• {t.demo_chat.insight_descontinuar}</li>
                  <li>• {t.demo_chat.insight_promocao}</li>
                  <li>• {t.demo_chat.insight_resultado}</li>
                </InsightBox>
              </BotBubble>
            </div>
          </ChatMessage>

          <ChatMessage isUser={true} isVisible={step >= 5}>
            {t.demo_chat.user_crescer}
          </ChatMessage>

          <ChatMessage isUser={false} isVisible={step >= 6}>
            <div className="space-y-3">
              <BotBubble>
                <p className="text-sm text-profeta-secondary mb-3">{t.demo_chat.bot_crescer_intro}</p>
                <ParetoChart isVisible={step >= 6} labels={t.demo_chat} />
                <AlertCard variant="atencao" title={t.demo_chat.alert6_title} className="mt-2">
                  <p className="text-xs text-profeta-secondary">{t.demo_chat.alert6_desc}</p>
                </AlertCard>
                <InsightBox variant="green" title={t.demo_chat.insight_opps} className="mt-3">
                  <li>• {t.demo_chat.insight_ruptura}</li>
                  <li>• {t.demo_chat.insight_janela}</li>
                  <li>• {t.demo_chat.insight_expandir}</li>
                </InsightBox>
              </BotBubble>
            </div>
          </ChatMessage>
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 border-t border-profeta-border bg-[#F5F5F5] px-4 py-3">
          <input
            type="text"
            disabled
            placeholder={t.demo_chat.input_placeholder}
            className="flex-1 min-w-0 rounded-xl border border-profeta-border bg-white px-4 py-2.5 text-sm text-profeta-muted placeholder:text-profeta-muted/70 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            disabled
            className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-profeta-green text-white"
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-[9px] text-profeta-muted py-2">
          {t.demo_chat.disclaimer}
        </p>
      </div>
    </div>
  );
}
