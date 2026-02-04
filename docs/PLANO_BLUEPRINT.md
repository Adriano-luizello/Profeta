# Plano Blueprint – Status e Próximos Passos

**Fonte:** [profeta_blueprint_implementation](.cursor/plans/profeta_blueprint_implementation_0b677005.plan.md) (Cursor Plans)  
**Última atualização:** 2026-01-27

---

## Resumo do plano (5 fases)

| Fase | Foco | Duração |
|------|------|---------|
| **1** | Schema (orgs, settings), onboarding, Analytics Engine, dashboard base | 2–3 sem |
| **2** | Persistir forecasts, supply chain, recomendações, alertas, dashboard real | 3–4 sem |
| **3** | Chat, `generate_chart`, ChartRenderer, export PNG/PDF | 2–3 sem |
| **4** | Product quality, SKU Overview, Settings | 2–3 sem |
| **5** | Marketing, integrações, multi-tenant, cron | 4–6 sem |

---

## Status atual

### Fase 1 ✅ (concluída)

- **1.1 Schema:** `organizations`, `profeta_users`, `settings`, `organization_id` em `analyses`. Migrations 002 e 003.
- **1.2 Onboarding:** Step 1 (empresa) → Step 2 (supply chain) → Step 3 (upload). Middleware redireciona quem não completou.
- **1.3 Analytics Engine:** `lib/analytics/types.ts`, `lib/analytics/engine.ts` (forecast como primeiro `analysis_type`).
- **1.4 Dashboard:** Layout com sidebar (Dashboard, Upload, Configurações). Metrics cards (Unidades, Dias com vendas, Stockouts evitados, Produtos em risco). Gráfico “Vendas e previsão”. Tabela **Supply Chain Intelligence** (Figma). Lista de análises em Upload.

**Extras já feitos (alinhados à Fase 2):**

- Pipeline automático (upload → clean → forecast) via `POST /api/analyses/[id]/pipeline`.
- Persistência de `forecasts` e `recommendations` no Supabase.
- KPIs “Produtos em risco” (count + lista) e **“Stockouts evitados”** (métrica real: rastreamento em `alert_actions`, Migration 007, “Marcar como pedido feito” em Alertas e Supply Chain, toast + itens somem).
- Supply chain: uso de `settings` (lead time, MOQ) na tabela e nas recomendações.

---

### Fase 2 ✅ (concluída)

| Item | Status |
|------|--------|
| **2.1** Forecast persistido e consultável | ✅ Feito |
| **2.2** Supply chain | ✅ `supply-chain-calculator`, `recommendation-generator`, CRUD fornecedores (migration 004, API, UI em Configurações) |
| **2.3** Alertas (stockout 14/7 dias) | ✅ Regras por `urgency` (high/critical → HOJE; restock → 3 dias). UI “Alertas de Reordenamento” (Figma) no dashboard. |
| **2.4** Dashboard “real” | ✅ Métricas, Supply Chain table, forecast chart, alertas. |

**Arquivos novos/alterados (Fase 2):**

- `lib/analytics/supply-chain-calculator.ts` – reorder point, safety stock, MOQ, `mapSettingsToParams`.
- `lib/analytics/recommendation-generator.ts` – gera recomendações a partir de forecast + supply chain.
- `lib/dashboard-data.ts` – `AlertaReordenamento`, `alertas` em KPIs.
- `components/AlertasReordenamento.tsx` – cards de alertas (estilo Figma).
- `components/SuppliersSettings.tsx` – CRUD fornecedores em Configurações.
- `app/api/suppliers/route.ts` – GET, POST.
- `app/api/suppliers/[id]/route.ts` – GET, PATCH, DELETE.
- `supabase/migrations/004_suppliers.sql` – tabela `suppliers`, `supplier_id` em `products`.

---

### Fase 3 ✅ (concluída)

- **Chat Analytics:** Sidebar de chat no layout do dashboard (entre nav e conteúdo).
- **`POST /api/chat`:** Detecta intenção por palavras‑chave (previsão, supply chain, alertas, vendas por mês), chama `ChartDataGenerator` e retorna `{ content, chart? }`.
- **`lib/analytics/chart-data-generator.ts`:** Gera dados para gráficos `forecast`, `line` e tabelas `supply_chain` / `alertas` a partir de sales, forecasts e KPIs.
- **`components/chat/`:** `ChatSidebar`, `ChatMessage`, `ChatChart`. Gráficos com Chart.js (forecast, line) e tabelas. Botões **Exportar PNG** e **Exportar PDF** (html2canvas + jspdf).

---

### Fases 4–5 ⏳ (não iniciadas)

- **Fase 4:** Product quality, SKU Overview, Settings (fornecedores já em Configurações).
- **Fase 5:** Marketing, integrações, multi-tenant, cron.

---

## Próximos passos sugeridos (ordem)

1. **Iniciar Fase 4 – Product quality, SKU Overview**

---

## Referência de design

- **Figma → code:** `design/figma-profeta/` (Dashboard, Chat, SKU Overview).
- **Seção 7 do plano:** uso de `DashboardCards`, `ChatAnalytics`, `ChatMessage`, `SKUOverview` ao implementar cada fase.

---

_Atualizado conforme o estado do repositório e o plano blueprint._
