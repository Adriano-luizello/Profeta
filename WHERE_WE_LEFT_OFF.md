# 📍 Where We Left Off - Profeta MVP

**Last Session Date**: 2026-02-08  
**Status**: 🎉 **P1 100% COMPLETO** — Pipeline otimizado (3.9x mais rápido), Status Tracking implementado. Sistema pronto para produção.

---

## 🎉 Sessão 2026-02-08 — P1 COMPLETE (Pipeline Optimization)

### ✅ O que foi feito

**P1 #3: Instrumentação do Pipeline**
- Timing logs em todas as etapas (TypeScript + Python)
- Formato padronizado: `[Módulo] mensagem`
- Métricas por etapa, produto, categoria
- Identificado gargalo: Prophet = 83% do tempo (54.5s/65.7s)

**P1 #4: Prophet Smart Toggle + Optimization**
- `_should_use_prophet()`: detecta frequência de dados (diário/semanal/mensal)
- Prophet desativado para dados mensais/esparsos (< 90 pontos)
- `_forecast_by_product_xgboost_only()`: forecasts sem Prophet
- `_forecast_by_category_xgboost_only()`: **agregação inteligente** (soma produtos = categoria)
- Paralelização de categorias Prophet (ThreadPoolExecutor)
- Fix: campo `recommendations` obrigatório no Pydantic

**P1 #5: Pipeline Status Tracking**
- Migration 019: campo `pipeline_started_at` + índices
- Helper `updatePipelineStatus()`: centraliza updates + logging
- Status: cleaning → forecasting → completed/failed
- Endpoint GET `/api/analyses/[id]/status` para polling
- Error messages específicos por etapa

### 📊 Performance Alcançada

| Métrica | Antes | Depois | Ganho |
|---------|-------|--------|-------|
| **Pipeline Total** | 65.7s | 16.7s | **3.9x** 🚀 |
| **Categorias** | 29s (Prophet) | 0.5s (XGBoost) | **58x** 🚀 |
| **Forecast** | ~10s | 4.3s | **2.3x** |
| **Category Forecasts** | `[]` vazio | 5-6 categorias | **Dashboard OK** ✅ |

### 📦 Commits

```
09f2ec2 docs: add comprehensive test guides for P1 optimizations
56feb99 feat(pipeline): add status tracking and error visibility
0fd1b25 feat(forecast): optimize prophet with smart toggle and category xgboost fallback
e8235ad feat(pipeline): add comprehensive timing instrumentation
```

### 📁 Arquivos Criados/Modificados

**Código:**
- `profeta-forecaster/models/forecaster.py` (434 linhas)
- `app/api/analyses/[id]/pipeline/route.ts`
- `app/api/analyses/[id]/status/route.ts` (**NOVO**)
- `lib/services/run-clean.ts`
- `lib/services/update-pipeline-status.ts` (**NOVO**)
- `supabase/migrations/019_pipeline_status_tracking.sql` (**NOVO**)

**Documentação:**
- `PROPHET_OPTIMIZATION_TEST_GUIDE.md`
- `CATEGORY_FORECAST_XGB_TEST_GUIDE.md`
- `PIPELINE_STATUS_TEST_GUIDE.md`
- `PIPELINE_STATUS_IMPLEMENTATION.md`
- `P1_COMPLETE_SUMMARY.md`

### ✅ Testes Validados

- [x] Prophet desativado para dados mensais (logs confirmam)
- [x] Categories XGBoost agregando (5-6 categorias)
- [x] Status tracking funcionando (cleaning → forecasting → completed)
- [x] avg_daily_demand persistido (migration 017)
- [x] Dashboard carrega sem erros
- [x] Pipeline em 16.7s vs 65.7s anterior

### 🚀 Estado Atual

**Migrations aplicadas:**
- 017_supply_chain_fields.sql ✅
- 018_rate_limits.sql ✅
- 019_pipeline_status_tracking.sql ✅

**Servidores rodando:**
- Next.js: http://127.0.0.1:3005
- Python Forecaster: http://127.0.0.1:8000

**Logs de sucesso:**
```
[Pipeline] 🧹 Status: cleaning → d6366351...
[Clean] Total: 3360ms | 10 produtos | Custo: $0.0047
[Pipeline] 🔮 Status: forecasting → d6366351...
[Forecast] Total: 5.1s | FE: 0.3s | XGB: 2.2s | XGB Cat: 0.7s
[Forecast] Categorias XGBoost agregadas: 0.7s (5 categorias)
[Pipeline] ✅ Status: completed → d6366351...
```

### 📋 Próximos Passos

**Opção 1: Deploy para Produção** 🚀
- Aplicar migrations 018 e 019 no Supabase de produção
- Deploy Vercel (frontend + migrations)
- Deploy Render (Python forecaster)
- Validar com dados reais

**Opção 2: P2 — Dashboard Enhancements**
- Frontend polling para status (UI mostra progresso)
- Melhorias visuais (gráficos, exportação)
- Real-time updates

**Opção 3: Revisão e Documentação**
- Criar guia de deploy completo
- Atualizar README com novas features
- Preparar release notes

---

## 🧭 Sessão 2026-02-07 — Supply Chain Intelligence (Reorder Point + MOQ)

### O que foi feito

1. **Arquitetura Híbrida Python + TypeScript**
   - **Python (pipeline time)**: Calcula e persiste `avg_daily_demand` por produto após gerar forecasts.
   - **TypeScript (request time)**: Calcula ROP, dias até ruptura, urgência, MOQ alerts em tempo real.

2. **Migration 017**: `supply_chain_fields.sql`
   - `products.avg_daily_demand` DECIMAL(10,4) — demanda diária média calculada pelo Python
   - `products.safety_stock_days` INTEGER DEFAULT 7 — dias de estoque de segurança desejados

3. **Python: `profeta-forecaster/models/forecaster.py`**
   - Nova função `_calculate_and_persist_avg_daily_demand()` (linha ~1115)
   - Calcula avg_daily_demand a partir do forecast_90d (ou 60d/30d como fallback)
   - Lógica: se forecast é mensal → `total / dias_no_período`, se diário → `total / número_de_dias`
   - Persiste no Supabase com batch update após gerar todos os forecasts
   - Chamada adicionada no `generate_forecast()` (linha ~449)

4. **TypeScript: `lib/supply-chain.ts`** (novo arquivo)
   - `getSupplyChainMetrics()` — função principal que calcula métricas em tempo real
   - **Métricas calculadas:**
     - `safety_stock_units = avg_daily_demand × safety_stock_days`
     - `reorder_point = (avg_daily_demand × lead_time) + safety_stock_units`
     - `days_until_stockout = current_stock / avg_daily_demand`
     - `stockout_date = hoje + days_until_stockout`
     - `urgency_level`: critical | attention | informative | ok
     - `recommended_order_qty = max(consumo_90d - estoque, moq)`
   - **Lógica de urgência:**
     - 🔴 **Critical**: estoque = 0 OU `days_until_stockout < lead_time` (ruptura inevitável)
     - 🟡 **Attention**: `lead_time ≤ days < lead_time + 7` (janela de pedido fechando)
     - 🔵 **Informative**: `lead_time + 7 ≤ days < lead_time + 14` (monitorar)
     - 🟢 **OK**: `days ≥ lead_time + 14` (confortável)
   - **MOQ Alerts:**
     - Detecta quando MOQ > necessidade real
     - Calcula quantos meses de estoque o MOQ representa
     - Sugere negociar MOQ menor ou aceitar excesso

5. **Chart Data Generator** (`lib/analytics/chart-data-generator.ts`)
   - `supplyChainTable()` atualizada para usar `getSupplyChainMetrics()`
   - Adiciona filtro `urgency_filter` (all | critical | attention)
   - **Tabela expandida com:**
     - Estoque atual, dias até ruptura, data de ruptura
     - Reorder point, urgência (com emoji), motivo
     - Quantidade sugerida, alerta de MOQ, fornecedor, lead time

6. **Tool do AI Assistant** (`lib/ai/tool-definitions.ts`)
   - `get_supply_chain_analysis` expandida com descrição completa
   - Novo parâmetro `urgency_filter` para filtrar por urgência
   - Usuário pode perguntar: "Produtos críticos" → filtra apenas critical

7. **Dashboard KPIs** (`lib/dashboard-data.ts`)
   - `getDashboardKpis()` atualizada com **retrocompatibilidade**
   - **Tenta** usar novas métricas de supply chain (se `avg_daily_demand` disponível)
   - **Fallback** para sistema antigo (recommendations) se pipeline não rodou ainda
   - Mapeia `SupplyChainMetrics` → `ProdutoEmRisco` e `AlertaReordenamento` (compatibilidade com UI)

8. **Documentação**
   - Criado `docs/SUPPLY_CHAIN_INTELLIGENCE.md` com documentação completa
   - Inclui: arquitetura, lógica de urgência, MOQ alerts, como testar, próximos passos

### Commits
- `feat: implement supply chain intelligence (reorder point + moq)` — implementação completa do sistema híbrido

### Estado atual

- **Migration 017** pronta para aplicar no Supabase
- **Python** calcula e persiste `avg_daily_demand` após forecast
- **TypeScript** calcula ROP, urgência, MOQ alerts em tempo real
- **Dashboard** usa novas métricas quando disponíveis, fallback para recommendations
- **Chat** retorna tabela expandida com todas as métricas de supply chain
- **Retrocompatibilidade** garantida: funciona mesmo se pipeline não rodou com nova versão

### Para fazer (próxima sessão)

1. **Testar implementação:**
   - Aplicar migration 017 no Supabase
   - Rodar pipeline de forecast com dados reais
   - Verificar que `avg_daily_demand` é calculado e persistido
   - Abrir dashboard e verificar alertas com novas métricas
   - Testar chat: "Quais produtos estão em risco?" → deve retornar tabela expandida

2. **Ajustes se necessário:**
   - Se avg_daily_demand estiver inflado/deflacionado, ajustar cálculo no Python
   - Se urgência não faz sentido, ajustar thresholds no TypeScript
   - Se MOQ alerts forem muito frequentes, ajustar lógica

3. **Próximos itens do roadmap:**
   - Deploy no Vercel (código pronto)
   - UI melhorias (chat à direita, menu expandível)
   - Categorias com lógica XGBoost para 60d/90d (igual produtos)

---

## 🧭 Sessão 2026-02-05 — Forecast 60d/90d e anotações de UI

### O que foi feito

1. **Vendas totais 60d/90d infladas**
   - Causa: Prophet gera previsões **diárias** a partir de histórico **mensal** (poucos pontos); ao agregar em mensal, valores explodiam.
   - **Solução:** Em `profeta-forecaster/models/forecaster.py`, quando histórico é mensal e horizonte é 60 ou 90, usar **só XGBoost** (que já prevê mensal). Flag `_current_df_is_monthly` em `_forecast_by_product`; em `_select_best_forecast`, early return com XGBoost nesses casos.
   - **Rede de segurança:** Métodos `_clamp_daily_forecasts` e `_clamp_monthly_forecasts` mantidos (defaults 3x diário, 2.5x mensal) para casos extremos.
   - Detalhes: `docs/VENDAS_TOTAIS_60_90_INVESTIGATION.md`.

2. **Commits**
   - `fix: clamp daily/monthly forecasts...` — clamps iniciais
   - `fix: reduce clamp multipliers to 1.5x...` — depois revertidos para 3x/2.5x
   - `fix: use XGBoost-only for 60d/90d when historical data is monthly` — causa raiz

### Para fazer depois (anotado)

1. **Categorias ainda usam Prophet** — O fluxo por **categoria** (`_forecast_by_category`) não aplica a lógica “histórico mensal + 60d/90d → só XGBoost”. Replicar a mesma ideia quando priorizar.
2. **Chat Analytics** — Mover para a **direita** (depois do `main`) em `app/dashboard/layout.tsx` e garantir que possa ser **minimizado** (estado já existe em `ChatSidebar`; ajustar ordem no flex e largura quando minimizado).
3. **Menu de navegação** — Tornar **expandível** (colapsado = só ícones, expandido = ícones + texto). Sidebar em `app/dashboard/layout.tsx`; pode usar padrão de `design/figma-profeta/src/components/ui/sidebar.tsx` ou estado + `localStorage` para preferência.

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

**Última atualização:** 2026-02-05. Forecast 60d/90d corrigido; próximos: deploy Vercel, ou UI (chat à direita, menu expandível, categorias XGBoost). 🚀
