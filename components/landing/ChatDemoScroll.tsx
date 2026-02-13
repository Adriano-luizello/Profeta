"use client";

import { useLocale } from "@/lib/locale-context";
import { AlertTriangle, CheckCircle2, BarChart3, Sparkles } from "lucide-react";
import { ProfetaLogo } from "@/components/profeta/ProfetaLogo";

function Badge({ variant, children }: { variant: "critico" | "atencao" | "ok"; children: React.ReactNode }) {
  const styles = {
    critico: "bg-transparent text-red-600 border-red-300 [&_.dot]:bg-red-500",
    atencao: "bg-transparent text-amber-600 border-amber-300 [&_.dot]:bg-amber-500",
    ok: "bg-transparent text-profeta-green border-profeta-green/50 [&_.dot]:bg-profeta-green",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${styles[variant]}`}>
      <span className="dot h-1.5 w-1.5 shrink-0 rounded-full" />
      {children}
    </span>
  );
}

function MetricBox({ label, value, variant = "default" }: { label: string; value: string; variant?: "default" | "danger" }) {
  return (
    <div className={`flex flex-col rounded-xl border px-4 py-3 min-w-[90px] ${
      variant === "danger" ? "border-red-300 bg-white" : "border-profeta-border bg-profeta-surface/50"
    }`}>
      <span className="text-[10px] uppercase text-profeta-muted tracking-wider font-medium">{label}</span>
      <span className={`font-mono text-base font-bold mt-0.5 ${variant === "danger" ? "text-red-600" : "text-profeta-primary"}`}>
        {value}
      </span>
    </div>
  );
}

function AlertCard({ variant, title, children, className = "" }: { variant: "critico" | "atencao" | "ok"; title: string; children: React.ReactNode; className?: string }) {
  const config = {
    critico: { border: "border-l-red-500", icon: AlertTriangle, iconClass: "text-red-500" },
    atencao: { border: "border-l-amber-500", icon: AlertTriangle, iconClass: "text-amber-500" },
    ok: { border: "border-l-profeta-green", icon: CheckCircle2, iconClass: "text-profeta-green" },
  };
  const { border, icon: Icon, iconClass } = config[variant];
  return (
    <div className={`rounded-xl border border-profeta-border bg-white pl-5 pr-4 py-4 border-l-4 ${border} ${className}`}>
      <div className="flex items-center gap-4 flex-wrap mb-5">
        <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} />
        <p className="font-semibold text-profeta-primary text-sm">{title}</p>
        <Badge variant={variant}>{variant === "critico" ? "Crítico" : variant === "atencao" ? "Atenção" : "OK"}</Badge>
      </div>
      <div className="text-sm text-profeta-secondary">{children}</div>
    </div>
  );
}

function InsightBox({ variant, title, children, className = "" }: { variant: "green" | "amber"; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-profeta-border bg-white px-4 py-4 ${className}`}>
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="w-4 h-4 shrink-0 text-profeta-green" />
        <p className="text-sm font-semibold text-profeta-primary">{title}</p>
      </div>
      <ul className="space-y-1.5 text-sm text-profeta-secondary">{children}</ul>
    </div>
  );
}

function ParetoBar({ label, name, percent }: { label: string; name: string; percent: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-6 shrink-0 text-xs font-mono text-profeta-muted font-medium">{label}</span>
      <span className="min-w-[100px] shrink-0 truncate text-sm text-profeta-primary">{name}</span>
      <div className="flex-1 min-w-0 h-6 rounded-lg bg-profeta-surface overflow-hidden">
        <div className="h-full bg-gradient-to-r from-profeta-green to-emerald-500 rounded-lg pareto-bar-reveal" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-sm font-mono font-bold text-profeta-primary">{percent}%</span>
    </div>
  );
}

/** Tabela visual de produtos parados */
function DeadStockTable({ labels }: { labels: Record<string, string> }) {
  const rows = [
    { produto: labels.alert4_title, status: "critico" as const, capital: "R$ 4.920", custo: "R$ 380", acao: labels.insight_descontinuar },
    { produto: labels.alert5_title, status: "atencao" as const, capital: "—", custo: "—", acao: labels.insight_promocao },
  ];
  return (
    <div className="rounded-xl border border-profeta-border bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-profeta-surface/80 border-b border-profeta-border">
              <th className="text-left px-4 py-3 font-semibold text-profeta-primary">{labels.table_produto}</th>
              <th className="text-left px-4 py-3 font-semibold text-profeta-primary">{labels.table_status}</th>
              <th className="text-right px-4 py-3 font-semibold text-profeta-primary">{labels.metric_capital}</th>
              <th className="text-right px-4 py-3 font-semibold text-profeta-primary">{labels.metric_custo_mes}</th>
              <th className="text-left px-4 py-3 font-semibold text-profeta-primary">{labels.table_acao}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-profeta-border last:border-b-0 hover:bg-profeta-surface/30 transition-colors">
                <td className="px-4 py-3 font-medium text-profeta-primary">{r.produto}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      r.status === "critico" ? "border-red-300 text-red-600" : "border-amber-300 text-amber-600"
                    }`}
                  >
                    {r.status === "critico" ? "Crítico" : "Atenção"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-profeta-primary">{r.capital}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-profeta-primary">{r.custo}</td>
                <td className="px-4 py-3 text-profeta-secondary text-[13px]">{r.acao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 bg-profeta-surface/50 border-t border-profeta-border">
        <p className="text-sm font-semibold text-profeta-primary flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-profeta-green shrink-0" />
          {labels.table_total_impacto}: {labels.insight_resultado}
        </p>
      </div>
    </div>
  );
}

function ParetoChart({ labels }: { labels: Record<string, string> }) {
  const rows = [
    { rank: "1", name: labels.pareto1, percent: 28 },
    { rank: "2", name: labels.pareto2, percent: 22 },
    { rank: "3", name: labels.pareto3, percent: 15 },
    { rank: "4", name: labels.pareto4, percent: 5 },
    { rank: "5", name: labels.pareto5, percent: 3 },
  ];
  return (
    <div className="space-y-4 rounded-xl border border-profeta-border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4 h-4 text-profeta-green" />
        <span className="text-sm font-semibold text-profeta-primary">Análise Pareto (80/20)</span>
      </div>
      {rows.map((r) => (
        <ParetoBar key={r.rank} label={r.rank} name={r.name} percent={r.percent} />
      ))}
    </div>
  );
}

export function ChatDemoScroll({ className }: { className?: string }) {
  const { t } = useLocale();

  return (
    <section id="demo" className={`relative bg-noise py-24 ${className ?? "bg-profeta-surface"}`}>
      {/* Header */}
      <div className="px-4 text-center mb-16">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] mb-3" style={{ color: "#52796A" }}>
          {t.demo.label}
        </p>
        <h2 className="font-display text-3xl md:text-4xl text-profeta-primary max-w-2xl mx-auto">{t.demo.title}</h2>
        <p className="mt-4 text-lg text-profeta-secondary max-w-xl mx-auto">{t.demo.subtitle}</p>
      </div>

      {/* Spacer — bounce indicator (texto já está no header) */}
      <div className="h-[16vh] flex justify-center items-center" aria-hidden>
        <div className="relative h-6 w-px">
          <span
            className="absolute left-0 top-0 w-px bg-profeta-muted animate-soft-bounce"
            style={{ height: "12px" }}
          />
        </div>
      </div>

      {/* Mensagens — pop ao entrar no centro da viewport; sem typing, direto para resposta */}
      <div className="max-w-[900px] mx-auto px-4 flex flex-col gap-8 md:gap-10">
            {/* Msg 1 — intro */}
            <div className="chat-reveal-message-bot flex gap-3">
              <div className="shrink-0">
                <ProfetaLogo size={40} variant="default" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-profeta-muted mb-1.5 font-medium">Profeta AI</p>
                <div className="rounded-2xl border border-profeta-border bg-white px-5 py-4 shadow-sm">
                  <p className="text-sm text-profeta-secondary leading-relaxed">{t.demo_chat.bot_intro}</p>
                </div>
              </div>
            </div>

            {/* Msg 2 — user */}
            <div className="chat-reveal-message-user flex justify-end">
              <div className="max-w-[85%] rounded-2xl border border-profeta-border bg-profeta-surface/50 px-5 py-4">
                <p className="text-sm text-profeta-primary">{t.demo_chat.user_pedido}</p>
              </div>
            </div>

            {/* Msg 3 — bot1 */}
            <div className="chat-reveal-message-bot flex gap-3">
              <div className="shrink-0">
                <ProfetaLogo size={40} variant="default" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-profeta-muted font-medium mb-1.5">Profeta AI</p>
                <div className="rounded-2xl border border-profeta-border bg-white px-5 py-4 shadow-sm space-y-4">
                  <p className="text-sm text-profeta-secondary">{t.demo_chat.bot_pedido_intro}</p>
                  <AlertCard variant="critico" title={t.demo_chat.alert1_title}>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <MetricBox label={t.demo_chat.metric_estoque} value="23un" variant="danger" />
                    <MetricBox label={t.demo_chat.metric_acaba} value="8 dias" variant="danger" />
                    <MetricBox label={t.demo_chat.metric_lead} value="21 dias" variant="danger" />
                    <MetricBox label={t.demo_chat.metric_gap} value="13 dias" variant="danger" />
                  </div>
                </AlertCard>
                <AlertCard variant="atencao" title={t.demo_chat.alert2_title}>
                  <p className="text-profeta-secondary">{t.demo_chat.alert2_desc}</p>
                </AlertCard>
                <AlertCard variant="ok" title={t.demo_chat.alert3_title}>
                  <p className="text-profeta-secondary">{t.demo_chat.alert3_desc}</p>
                </AlertCard>
                <InsightBox variant="green" title={t.demo_chat.insight_steps}>
                  <li>• {t.demo_chat.insight_pedir}</li>
                  <li>• {t.demo_chat.insight_negociar}</li>
                  <li>• {t.demo_chat.insight_consolidar}</li>
                </InsightBox>
                </div>
              </div>
            </div>

            {/* Msg 4 — user2 */}
            <div className="chat-reveal-message-user flex justify-end">
              <div className="max-w-[85%] rounded-2xl border border-profeta-border bg-profeta-surface/50 px-5 py-4">
                <p className="text-sm text-profeta-primary">{t.demo_chat.user_parados}</p>
              </div>
            </div>

            {/* Msg 5 — bot2 */}
            <div className="chat-reveal-message-bot flex gap-3">
              <div className="shrink-0">
                <ProfetaLogo size={40} variant="default" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-profeta-muted font-medium mb-1.5">Profeta AI</p>
                <div className="rounded-2xl border border-profeta-border bg-white px-5 py-4 shadow-sm space-y-4">
                  <p className="text-sm text-profeta-secondary">{t.demo_chat.bot_parados_intro}</p>
                  <DeadStockTable labels={t.demo_chat} />
                </div>
              </div>
            </div>

            {/* Msg 6 — user3 */}
            <div className="chat-reveal-message-user flex justify-end">
              <div className="max-w-[85%] rounded-2xl border border-profeta-border bg-profeta-surface/50 px-5 py-4">
                <p className="text-sm text-profeta-primary">{t.demo_chat.user_crescer}</p>
              </div>
            </div>

            {/* Msg 7 — bot3 */}
            <div className="chat-reveal-message-bot flex gap-3">
              <div className="shrink-0">
                <ProfetaLogo size={40} variant="default" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-profeta-muted font-medium mb-1.5">Profeta AI</p>
                <div className="rounded-2xl border border-profeta-border bg-white px-5 py-4 shadow-sm space-y-4">
                  <p className="text-sm text-profeta-secondary">{t.demo_chat.bot_crescer_intro}</p>
                  <ParetoChart labels={t.demo_chat} />
                <AlertCard variant="atencao" title={t.demo_chat.alert6_title}>
                  <p className="text-profeta-secondary">{t.demo_chat.alert6_desc}</p>
                </AlertCard>
                <InsightBox variant="green" title={t.demo_chat.insight_opps}>
                  <li>• {t.demo_chat.insight_ruptura}</li>
                  <li>• {t.demo_chat.insight_janela}</li>
                  <li>• {t.demo_chat.insight_expandir}</li>
                </InsightBox>
                </div>
              </div>
            </div>

            {/* Msg 8 — user encerra */}
            <div className="chat-reveal-message-user flex justify-end">
              <div className="max-w-[85%] rounded-2xl border border-profeta-border bg-profeta-surface/50 px-5 py-4">
                <p className="text-sm text-profeta-primary">{t.demo_chat.user_obrigado}</p>
              </div>
            </div>
      </div>
    </section>
  );
}
