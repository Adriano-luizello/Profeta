# 📍 Where We Left Off - Profeta MVP

**Last Session Date**: 2026-02-04  
**Status**: Código limpo, dashboard único, UI ok, build passando. **Pronto para deploy no Vercel.**

---

## 🧭 Sessão 2026-02-04 — Limpeza e preparação para deploy

### O que foi feito

1. **Backup (commit `d4b2bf4`)**
   - Commit `backup: antes de remover dashboard secundário` com todo o estado antes da limpeza.

2. **Remoção do dashboard secundário (Model Router)**
   - Removido botão "Projeções (Model Router)" em `app/dashboard/page.tsx`.
   - Removida rota `app/dashboard/[analysisId]/` (página inteira).
   - Removido proxy `app/api/dashboard/[analysisId]/`.
   - Removidos componentes exclusivos: `SummaryCards.tsx`, `TopProductsTable.tsx`.
   - Removido hook `hooks/useDashboard.ts`.
   - **Mantidos:** `PeriodSelector`, `lib/types/dashboard.ts`, `DashboardAnalysisView` e todo o dashboard principal.

3. **Remoção do link duplicado "Fornecedores"**
   - Menu lateral tinha "Configurações" e "Fornecedores" (ambos para a mesma tela). Removido o link "Fornecedores" e o ícone `Truck` de `app/dashboard/layout.tsx`. Acesso a fornecedores só via **Configurações** → `/dashboard/settings`.

4. **Correções pontuais**
   - `app/dashboard/upload/page.tsx`: `TransformError` usa `.reason` (não `.message`) para evitar erro de TypeScript no build.
   - `app/dashboard/page.tsx`: sem usuário agora faz `redirect('/login')` em vez de `return null` (evita tela em branco).
   - Adicionados `app/dashboard/loading.tsx` e `app/dashboard/error.tsx` para feedback de carregamento e erro.

5. **UI quebrada (estilos não carregando)**
   - **Causa:** existiam dois arquivos PostCSS: `postcss.config.js` (válido) e `postcss.config.mjs` (usava `module.exports` em ESM, inválido). O Next podia carregar o `.mjs` e o Tailwind não era aplicado.
   - **Correção:** removido `postcss.config.mjs`. Mantido apenas `postcss.config.js`. Limpar `.next` e rebuild para aplicar.

6. **Commit de limpeza (commit `e46cd40`)**
   - Mensagem: `cleanup: remove dashboard secundário e link duplicado Fornecedores` com a lista das remoções e melhorias de UX.

### Commits de referência

| Commit     | Descrição |
|-----------|-----------|
| `d4b2bf4` | Backup antes de remover dashboard secundário |
| `e46cd40` | Limpeza: dashboard secundário + link Fornecedores removidos |

### Estado atual

- **Dashboard:** apenas um (principal em `/dashboard`), com abas Geral e Produtos, período 30/60/90, forecast e KPIs.
- **Menu lateral:** Dashboard, Upload, Configurações (fornecedores ficam em Configurações), Sair.
- **Build:** `npm run build` passa sem erros.
- **Configuração:** uma única `postcss.config.js` (Tailwind + Autoprefixer).

### Se aparecer "Truck is not defined"

O `layout.tsx` atual **não** usa `Truck` nem o link Fornecedores. Se o erro surgir, é cache: parar o dev server, `rm -rf .next`, `npm run dev` de novo.

### Próximos passos (quando retomar)

1. **Deploy no Vercel** — código pronto; configurar projeto, env vars (Supabase, etc.) e deploy.
2. Testes em produção (login, upload, dashboard, configurações).
3. Opcional: documentar no README o fluxo atual (um dashboard, menu, rotas).

---

## 🧭 Sessão 2026-02-03 — Dashboard Model Router

**Detalhamento completo:** ver **`docs/DASHBOARD_MODEL_ROUTER_STATUS.md`**.

Resumo: Ajustamos Supabase (service role no backend), proxy Next para evitar CORS, erros NoneType/float no dashboard service e model_router, e **erro de shapes (3,) vs (60,)** no ensemble para 60/90 dias (alinhamento por padding no `calculate_ensemble_forecast`). O dashboard Model Router foi **removido** na sessão 2026-02-04 (ver acima).

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

**Última atualização:** 2026-02-04. Pausa por hora; próxima sessão: deploy no Vercel ou testes adicionais. 🚀
