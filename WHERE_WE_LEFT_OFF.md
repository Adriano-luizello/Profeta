# 📍 Where We Left Off - Profeta MVP

**Last Session Date**: 2026-02-03  
**Status**: Dashboard Model Router em uso (30d ok); 60/90d com correção de shapes no ensemble — validar na próxima sessão.

---

## 🧭 Sessão 2026-02-03 — Dashboard Model Router

**Detalhamento completo:** ver **`docs/DASHBOARD_MODEL_ROUTER_STATUS.md`**.

Resumo: Ajustamos Supabase (service role no backend), proxy Next para evitar CORS, erros NoneType/float no dashboard service e model_router, e **erro de shapes (3,) vs (60,)** no ensemble para 60/90 dias (alinhamento por padding no `calculate_ensemble_forecast`). Períodos 60 e 90 precisam ser testados após reiniciar o BE.

---

## 🧭 Sessão 2026-01-27 — Onde paramos

### ✅ O que foi feito hoje

1. **Stockouts evitados “de verdade” (com rastreamento)**
   - Migration **007** (`supabase/migrations/007_alert_actions.sql`): tabela `alert_actions` (user_id, product_id, recommendation_id, action_type, created_at). RLS SELECT/INSERT. UNIQUE (product_id, recommendation_id).
   - **API** `POST /api/alert-actions` e `GET /api/alert-actions`: marcar “pedido feito” e listar `markedRecommendationIds`.
   - **Dashboard:** KPI **Stockouts evitados** = contagem de `alert_actions` dos **últimos 90 dias**. Subtítulo: “últimos 90 dias”.

2. **UI “Marcar como pedido feito”**
   - **Alertas de Reordenamento** e **Supply Chain Intelligence:** botão “Marcar como pedido feito” em cada item.
   - Ao clicar: `POST /api/alert-actions` → **toast** “Pedido marcado como feito!” (sonner) → item **some** da lista (filtramos marcados).
   - Se todos forem marcados: mensagem “Nenhum alerta/item pendente. Todos foram marcados como pedido feito.”

3. **Toast (sonner)**
   - `sonner` instalado. `components/Toaster.tsx` + `<Toaster />` no `app/layout.tsx`.
   - Toast de sucesso antes do item sumir, como pedido.

4. **Outros ajustes desta sessão**
   - Paginação em **Alertas** (10 por página) e **Supply Chain** (15 por página).
   - Coluna **fornecedor** no CSV: aceita nomes que **começam** com `fornecedor` ou `supplier` (ex.: “Fornecedor A”). Corrigido em `lib/utils/csv-validator.ts`.
   - Tratamento de erro e feedback ao clicar “Marcar como pedido feito” (evitar “nada acontece”).
   - Link não sobrepõe mais o botão nos cards de alerta.

### 📁 Arquivos relevantes

- `supabase/migrations/007_alert_actions.sql`
- `app/api/alert-actions/route.ts`
- `lib/dashboard-data.ts` — `stockoutsEvitados`, `markedRecommendationIds`, `recommendation_id` em alertas/lista
- `components/AlertasReordenamento.tsx` — botão, toast, filtrar marcados, paginação
- `components/SupplyChainIntelligenceTable.tsx` — idem
- `components/Toaster.tsx` — Sonner
- `app/layout.tsx` — `<Toaster />`
- `docs/PHASE1_MIGRATION.md` — seção Migration 007

### 🚀 Como rodar

```bash
cd /Users/adrianoluizello/Profeta
npm run dev
```

- **Dashboard:** http://localhost:3000 (ou 3001 se 3000 estiver em uso)
- **Upload:** `/dashboard/upload`
- **Configurações / Fornecedores:** `/dashboard/settings#fornecedores`

### ⚠️ Lembrete

- **Migration 007** precisa estar aplicada no Supabase (SQL Editor). Sem ela, “Marcar como pedido feito” falha (tabela `alert_actions` não existe).

---

## 🎯 Próximos passos (amanhã ou quando retomar)

1. **Fase 4 do blueprint:** Product quality, SKU Overview, Settings (ver `docs/PLANO_BLUEPRINT.md`).
2. Opcional: `npm audit fix` (há 3 vulnerabilities; não bloqueia o uso).

---

## ✅ Estado atual do produto

- **Onboarding** → **Dashboard** → **Upload** (CSV com date, product, quantity, price; opcionais: category, description, stock/estoque, supplier/fornecedor).
- **Pipeline automático:** upload → limpeza (GPT-4) → forecast (Prophet) → redirect para dashboard.
- **Dashboard:** KPIs (Unidades, Dias com vendas, **Stockouts evitados**, Produtos em risco), gráfico Vendas e previsão, **Alertas de Reordenamento** (paginação, “Marcar como pedido feito”, toast, itens somem), **Supply Chain Intelligence** (idem).
- **Chat** no layout (sidebar) com gráficos e export PNG/PDF.
- **Fornecedores:** CRUD em Configurações; CSV pode criar/vincular fornecedores; análise com dropdown por produto.

---

**Última atualização:** 2026-01-27. Bom descanso; amanhã continuamos daqui. 🚀
