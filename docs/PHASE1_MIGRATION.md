# Fase 1 – Migration 002 e onboarding

## 1. Rodar a migration no Supabase

No **Supabase Dashboard** → SQL Editor, execute o conteúdo de:

```
supabase/migrations/002_organizations_users_settings.sql
```

Isso cria `organizations`, `profeta_users`, `settings` e adiciona `organization_id` em `analyses`.

## 2. Regenerar o Next.js

Após alterações nas rotas da API, limpe o cache e reconstrua:

```bash
rm -rf .next
npm run dev
```

Ou apenas `npm run dev`; o Next regenera ao subir.

## 3. Fluxo de onboarding

1. **Signup** → confirmação de email (se ativada) → **Login**.
2. **Login** → redirecionamento para `/onboarding/step-1-company` (se ainda não fez onboarding).
3. **Step 1** – Nome da empresa → cria org + `profeta_users` → Step 2.
4. **Step 2** – Lead time, MOQ, alerta de stockout → grava em `settings`, marca `onboarding_complete` → Step 3.
5. **Step 3** – “Envie seus dados” → link para **Upload** ou **Dashboard**.
6. Quem já completou onboarding → **Dashboard** (com sidebar).

## 4. Rotas e APIs

- `GET/POST /api/onboarding/step-1` – cria org + user.
- `POST /api/onboarding/step-2` – salva settings, `onboarding_complete = true`.
- `/onboarding/step-1-company`, `step-2-supply-chain`, `step-3-upload` – páginas do fluxo.
- **Middleware** redireciona para onboarding se `onboarding_complete` for false ao acessar `/dashboard`.

## 5. Observações

- Usuários **antigos** (sem `profeta_users`) são enviados para o onboarding ao acessar o dashboard.
- **Novas análises** (upload) recebem `organization_id` quando o usuário tem org.
- A rota **duplicada** `/api/analyses/forecast` (sem `[id]`) foi removida; use `/api/analyses/[id]/forecast`.

---

## 6. Dashboard, Upload e pipeline (pós–Fase 1)

- **Dashboard** (`/dashboard`): foco em **vendas e projeções**. KPIs (unidades, dias com vendas), gráfico “Vendas e previsão” (Chart.js), dados agregados de `sales_history` e `forecasts`. Link para Upload.
- **Upload** (`/dashboard/upload`): formulário de upload CSV + lista **read‑only** “Arquivos enviados” (histórico de análises). Após salvar, redireciona para `/dashboard/upload?upload=success`.
- **Pipeline automático**: após `POST /api/analyses` (criar análise + produtos + vendas), o cliente chama `POST /api/analyses/[id]/pipeline` em background. O pipeline executa **limpeza** (GPT‑4) e **previsão** (Prophet), persiste previsões em `forecasts` e atualiza status da análise.
- **Lista de análises**: só em Upload; removida do dashboard. Detalhes em “Ver detalhes” → `/dashboard/analysis/[id]`.

### Migration 003 – Recomendações e KPIs

Execute no SQL Editor:

```
supabase/migrations/003_recommendations_delete_policy.sql
```

Isso adiciona política RLS de **DELETE** em `recommendations` (necessária para re-persistir ao rodar o pipeline).

- O pipeline **persiste recomendações** na tabela `recommendations` (ação, quantidade sugerida, risco, urgência).
- **Dashboard**: KPI **Produtos em risco** = quantidade de produtos com recomendação de reposição (`action` = `restock` ou `urgent_restock`). **Stockouts evitados**: ver Migration 007.

### Migration 004 – Fornecedores (Fase 2)

Execute no SQL Editor:

```
supabase/migrations/004_suppliers.sql
```

Isso cria a tabela `suppliers` (por `organization_id`) e adiciona `supplier_id` em `products`. RLS para CRUD por org.

- **Configurações** (`/dashboard/settings`): CRUD de fornecedores (nome, lead time, MOQ, notas).
- **API**: `GET/POST /api/suppliers`, `GET/PATCH/DELETE /api/suppliers/[id]`.
- **Fase 2**: `supply-chain-calculator`, `recommendation-generator`, **Alertas de Reordenamento** no dashboard (cards por urgência), tabela Supply Chain Intelligence. Ver `docs/PLANO_BLUEPRINT.md`.

### Migration 005 – UPDATE em products + CSV com fornecedor

Execute no SQL Editor:

```
supabase/migrations/005_products_update_policy.sql
```

Isso adiciona política RLS de **UPDATE** em `products` (permite alterar `supplier_id` etc.).

**CSV com fornecedor:**

- Coluna opcional `supplier` ou `fornecedor` no CSV. No upload, o sistema cria ou associa fornecedores por nome (org) e define `product.supplier_id`.
- **Fornecedores** em Configurações lista todos (CSV + manuais); o usuário edita lead time e MOQ de cada um.
- **Supply Chain** e **Alertas** usam lead time/MOQ do fornecedor do produto quando existir; senão, os padrões da org.
- **Análise** (`/dashboard/analysis/[id]`): coluna “Fornecedor” com dropdown para vincular produto → fornecedor manualmente. API `PATCH /api/products/[id]` atualiza `supplier_id`.

### Migration 007 – Stockouts evitados (rastreamento)

Execute no SQL Editor:

```
supabase/migrations/007_alert_actions.sql
```

Isso cria a tabela `alert_actions` para rastrear quando o usuário marca um alerta como **“pedido feito”**.

- **KPI Stockouts evitados**: contagem de `alert_actions` dos **últimos 90 dias** do usuário. Subtítulo do card: “últimos 90 dias”.
- **Alertas de Reordenamento** e **Supply Chain Intelligence**: botão “Marcar como pedido feito” por item. Ao clicar, `POST /api/alert-actions` com `product_id` e `recommendation_id`; o item passa a exibir “Pedido realizado ✓”.
- **API**: `POST /api/alert-actions` (marcar), `GET /api/alert-actions` (listar `markedRecommendationIds`; opcional).
