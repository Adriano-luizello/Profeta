# PROFETA — Estado Atual (Atualizado 11/02/2026)

## ⚠️ IMPORTANTE: Este documento substitui qualquer WHERE_WE_LEFT_OFF anterior. O estado abaixo reflete o que está REALMENTE em produção.

---

## 🟢 P1 — 100% CONCLUÍDO E EM PRODUÇÃO

Tudo abaixo já está deployado e funcionando:

### Infraestrutura de Produção
- **Frontend:** https://profeta-analytics.vercel.app (Vercel) ✅
- **Python API:** https://profeta-forecaster-api.onrender.com (Render) ✅
- **Database:** Supabase (hkrbqmdigjonqrgofgms) ✅
- **Todas as migrations aplicadas em produção** (017, 018, 019) ✅
- **Git:** Todos os commits pushados para GitHub ✅

### Features em Produção

**1. Supply Chain Intelligence (P1 #1-2) ✅**
- Migration 017: campos `avg_daily_demand`, `safety_stock_days`, `reorder_point` em products
- Python: calcula `avg_daily_demand` durante pipeline de forecast
- TypeScript: `lib/supply-chain.ts` — calcula em tempo real: ROP, days_until_stockout, urgency, MOQ alerts
- 4 níveis de urgência: 🔴 critical, 🟡 attention, 🔵 informative, 🟢 ok
- Tool `get_supply_chain_analysis` no AI Assistant (com filtro de urgência)
- Dashboard KPIs integrados (produtosEmRisco usa novas métricas)
- **Limitação atual:** urgência mostra "Dados insuficientes" porque `current_stock` não está populado nos dados de teste (campo existe, dados faltam no CSV)

**2. Pipeline Optimization (P1 #3) ✅**
- Prophet Smart Toggle: desativado para dados mensais (maior ganho)
- XGBoost-only para horizontes 60d/90d com dados mensais
- Agregação inteligente de categorias via XGBoost
- Paralelização de categorias Prophet
- **Performance medida:**
  - Pipeline total: 65.7s → 16.7s (3.9x mais rápido)
  - Forecast produtos: 60.9s → 4.3s (14x mais rápido)
  - Forecast categorias: 29s → 0.5s (58x mais rápido)

**3. Rate Limiting (P1 #4) ✅**
- Migration 018: tabela `rate_limits` com RLS
- Limites: 10 msgs/min, 2000 chars/msg, 50k tokens/dia
- Implementado em `app/api/chat/route.ts`

**4. Pipeline Status Tracking (P1 #5) ✅**
- Migration 019: campo `pipeline_started_at` + index
- Status tracking: cleaning → forecasting → completed/failed
- Emoji logs no pipeline para visibilidade
- Endpoint GET para polling de status

**5. Category Forecasts (P1 #6) ✅**
- XGBoost aggregation para categorias (antes era vazio)
- CORS explícito em produção
- 5-6 categorias geradas por análise

### Migrations em Produção
```
✅ 017_supply_chain_fields.sql — avg_daily_demand, safety_stock_days, reorder_point
✅ 018_rate_limits.sql — tabela rate_limits com RLS
✅ 019_pipeline_status_tracking.sql — pipeline_started_at + index
```

### Segurança
- Service Role Key: **NÃO** está commitada no repo (verificado)
- Decisão: **NÃO rotacionar agora** (exposição só em conversa privada, risco baixo)
- Plano: migrar para Supabase Secret API keys quando conveniente
- Guia disponível: `SECURITY_KEY_ROTATION_GUIDE.md`

---

## 🎯 P2 — EM ANDAMENTO (5 de 6 features completas)

### ✅ P2 #9: Pareto 80/20 — COMPLETO e EM PRODUÇÃO (11/02/2026)

**Implementado:**
- Tool `get_pareto_analysis` no AI Assistant
- Ranking de produtos por receita (últimos 90 dias, configurável)
- Identificação de top 20% gerando 80% da receita
- % contribuição e % acumulado por produto
- Capital preso em estoque (stock × price)
- Cruzamento com supply chain (urgência)

**3 views disponíveis:**
- `products`: Ranking completo com rank, receita, %, top 20%, urgência
- `categories`: Receita agrupada por categoria
- `at_risk`: Top sellers com risco de ruptura (critical/attention)

**Arquivos modificados:**
- `lib/dashboard-data.ts` — Interface `ParetoMetrics` + função `getParetoMetrics()`
- `lib/analytics/chart-data-generator.ts` — Função `paretoTable()` com 3 views
- `lib/ai/tool-definitions.ts` — Tool definition com rich description
- `app/api/chat/route.ts` — Handler integration

**Commits:**
- `647fca9` feat(analytics): implement Pareto 80/20 analysis
- `f9aa3ba` fix(pareto): resolve TypeScript type errors for null values

**Testado e validado em produção.**

---

### ✅ P2 #8: Estoque Parado + Stop Loss — COMPLETO (11/02/2026)

**Implementado:**
- Tool `get_dead_stock_analysis` no AI Assistant
- Classificação automática: ⚫ Parado (0 vendas) | 🟠 Lento (< 0.1 un/dia) | 🟢 Saudável
- Cálculo de capital preso em estoque (stock × price)
- Custo de oportunidade mensal (2% do capital)
- Cruzamento com forecast (tendência: crescente, declinante, estável, zero)
- Recomendações acionáveis: descontinuar, descontar, monitorar

**3 views disponíveis:**
- `all`: Lista detalhada de produtos problemáticos (dead + slow)
- `dead`: Apenas produtos com zero vendas nos últimos 90 dias
- `summary`: Resumo executivo com totais, capital preso e custos

**Arquivos modificados:**
- `lib/dashboard-data.ts` — Interface `DeadStockMetrics` + função `getDeadStockMetrics()`
- `lib/analytics/chart-data-generator.ts` — Função `deadStockTable()` com 3 filtros
- `lib/ai/tool-definitions.ts` — Tool definition com rich description
- `app/api/chat/route.ts` — Handler integration

**Commits:**
- `cc6d48b` feat(analytics): implement dead stock and stop loss analysis
- `b2386d9` docs: mark P2 #8 complete and add test guide

**Testado e validado em produção. Deploy: b2386d9**

**Screenshots:**
- Resumo executivo: 0 parados, 10 lentos, R$ 0 capital preso
- Lista detalhada: 10 produtos lentos com recomendações específicas
- Sistema funcionando perfeitamente ✅

---

### ✅ P2 #10: Velocidade de Giro (Turnover) — COMPLETO (11/02/2026)

**Implementado:**
- Tool `get_turnover_analysis` no AI Assistant
- Cálculo de days to turn: current_stock / avg_daily_sales
- Turnover rate: vezes que o estoque gira por ano (365 / days_to_turn)
- Classificação de saúde: 🟢 Excelente (≤30d) | 🟡 Bom (≤60d) | 🟠 Lento (≤120d) | 🔴 Crítico (>120d)
- Comparação com média da categoria: "2x mais rápido" | "Na média" | "3x mais lento"
- Eficiência de capital: R$ X,XX de receita por R$ 1,00 investido em estoque

**3 views disponíveis:**
- `products`: Giro individual por produto com saúde e eficiência (default)
- `categories`: Giro médio por categoria + % capital vs % receita (insight de ineficiência)
- `efficiency`: Ranking por ROI (receita/capital), identifica produtos com melhor retorno

**Arquivos modificados:**
- `lib/dashboard-data.ts` — Interface `TurnoverMetrics` + função `getTurnoverMetrics()`
- `lib/analytics/chart-data-generator.ts` — Função `turnoverTable()` com 3 views
- `lib/ai/tool-definitions.ts` — Tool definition com rich description
- `app/api/chat/route.ts` — Handler integration

**Caso especial tratado:**
- Se `current_stock` for null (dados de teste), exibe mensagem clara e tabela simplificada
- Sistema funciona automaticamente quando dados de estoque estiverem disponíveis

**Fórmula simplificada:**
- Usa turnover baseado em unidades (sem COGS, pois não temos custo)
- Estoque médio = `current_stock` (proxy, sem histórico de snapshots)
- Período padrão: 90 dias (configurável via `period_days`)

**Testado com sucesso:**
- Build passa sem erros TypeScript
- 3 views funcionais e testadas
- Edge cases tratados (estoque null, produtos sem vendas)

**Testado e deployado em produção.**

---

### ✅ P2 #11: Limite de Payload no Upload — COMPLETO (11/02/2026)

**Implementado:**
- Validação em 3 camadas: frontend (pre-upload), frontend (erro 413), backend (API)
- Hard limit: 50 MB (bloqueia upload)
- Warning limit: 10 MB (avisa, deixa continuar)
- Warning: > 50.000 linhas (avisa, deixa continuar)
- Validação de tipo de arquivo (.csv apenas)
- Mensagens claras e acionáveis em português
- UI de warning com botões "Continuar" e "Cancelar"
- Backend retorna 413 (Payload Too Large) com mensagem estruturada

**Arquivos modificados:**
- `lib/upload-limits.ts` — Constantes centralizadas + helpers (NEW)
- `app/dashboard/upload/page.tsx` — Validações frontend + UI de warning (+70 linhas)
- `app/api/analyses/route.ts` — Validação de Content-Length e body size (+20 linhas)

**Limites justificados:**
- 50 MB suporta até ~5.000 produtos com 5 anos de histórico
- Previne acidentes (CSV de 500MB+) e abuso
- Warnings não bloqueiam uso legítimo

**Testado com sucesso:**
- Build passa sem erros
- 3 camadas de validação implementadas
- Mensagens de erro e warning funcionais

**Testado e deployado em produção.**

---

### ✅ P2 #12: Observabilidade e Logging de Custos — COMPLETO (11/02/2026)

**Implementado:**
- Migration 020: Tabela `usage_logs` com RLS
- Tracking de consumo de Claude (chat) e GPT-4 (limpeza de dados)
- Fire-and-forget logging (nunca bloqueia fluxo principal)
- Cálculo automático de custos em centavos de USD
- Função `getUserUsageSummary()` para análise de consumo

**Pontos instrumentados:**
1. **Claude Chat**: Logging após cada mensagem (incluindo tool calls)
   - Metadata: `initial_call`, `tool_used`, `has_chart`
2. **GPT-4 Cleaning**: Logging após limpeza completa
   - Metadata: `product_count`, `processing_time_ms`, qualidade dos dados

**Estrutura da tabela:**
- `user_id`, `service`, `analysis_id`
- `input_tokens`, `output_tokens`, `total_tokens` (gerado)
- `estimated_cost_cents` (custo em centavos de USD)
- `model`, `metadata`, `created_at`
- 3 índices (user+date, service, analysis_id)
- RLS: usuário vê apenas seus logs, service role pode inserir

**Custos por modelo:**
- Claude 3.5 Sonnet: $3/$15 per M tokens
- GPT-4o-mini: $0.15/$0.60 per M tokens

**Arquivos criados:**
- `supabase/migrations/020_usage_logs.sql` — Nova tabela
- `lib/usage-logger.ts` — Helper de logging + resumo

**Arquivos modificados:**
- `app/api/chat/route.ts` — 2 pontos de logging (chamada inicial + tool calls)
- `lib/services/run-clean.ts` — 1 ponto de logging (após limpeza)

**Objetivo:**
- Calcular custo real por usuário antes de definir pricing
- Base para análise de viabilidade econômica do produto
- Dados para dashboard de consumo (futuro)

**Testado com sucesso:**
- Build passa sem erros
- Migration aplicada no Supabase
- Logging não bloqueia fluxo (fire and forget)

**Aguardando teste manual e push.**

---

### Ordem de implementação (atualizada):
1. ✅ **#9 Pareto 80/20** — COMPLETO e EM PRODUÇÃO
2. ✅ **#8 Estoque parado + Stop Loss** — COMPLETO e EM PRODUÇÃO
3. ✅ **#10 Velocidade de giro (Turnover)** — COMPLETO e EM PRODUÇÃO
4. ✅ **#11 Limite de payload** — COMPLETO e EM PRODUÇÃO
5. ✅ **#12 Observabilidade** — COMPLETO (aguardando teste e deploy)
6. **#7 Paralelizar XGBoost** (quando tiver clientes com catálogos grandes)

### O que o Pareto 80/20 precisa fazer:
- **Ranking de rentabilidade:** Top 20% de produtos por receita e sua contribuição % no total
- **Cruzamento com supply chain:** "Esses produtos são seus top 20% em receita MAS estão com estoque para só 15 dias e lead time é 30 dias" — urgência máxima
- **Cruzamento inverso:** "Esses produtos são bottom 20% em receita E ocupam 40% do capital em estoque" — candidatos a stop loss
- **Por categoria:** Quais categorias concentram a rentabilidade
- **Nova tool no AI Assistant** para o chat responder perguntas sobre Pareto
- **Dados necessários:** sales_history (receita por produto) — já existe. Margem/custo é opcional mas valioso.

---

## 📁 ARQUITETURA DO PROJETO

### Stack
- **Frontend:** Next.js 14 (App Router) + Tailwind + shadcn/ui
- **Backend:** Next.js API routes + Python (FastAPI no Render)
- **Database:** Supabase (PostgreSQL)
- **AI:** Claude (chat) + GPT-4 (limpeza de dados no pipeline)
- **ML:** XGBoost + Prophet (forecast)

### Estrutura de arquivos relevante para P2
```
lib/
├── supply-chain.ts          # Métricas de supply chain em tempo real (P1)
├── dashboard-data.ts        # KPIs do dashboard, queries ao Supabase
├── analytics/
│   └── chart-data-generator.ts  # Gera dados para gráficos/tabelas do chat
├── ai/
│   └── tool-definitions.ts  # Definição das tools do AI Assistant
├── csv-adapter.ts           # Parser de CSV → Supabase
app/
├── api/
│   └── chat/
│       └── route.ts         # Handler do chat (tool calls processadas aqui)
├── dashboard/
│   └── page.tsx             # Página principal do dashboard
components/
├── dashboard/               # Componentes visuais do dashboard
profeta-forecaster/
├── models/
│   └── forecaster.py        # XGBoost + Prophet (calcula avg_daily_demand)
├── main.py                  # FastAPI endpoints
supabase/
└── migrations/              # 001 a 019
```

### Padrão de implementação de uma tool (seguir para Pareto)
1. **Tool definition** → `lib/ai/tool-definitions.ts` (nome, descrição, input_schema)
2. **Handler** → `app/api/chat/route.ts` (switch/case que processa tool_calls)
3. **Chart data generator** → `lib/analytics/chart-data-generator.ts` (busca dados, formata output)
4. **Dashboard data** → `lib/dashboard-data.ts` (queries ao Supabase, lógica de negócio)
5. **Retorno** → formato `{ chartType: 'table' | 'bar' | ..., chartData: [...] }`

### Tabelas principais do Supabase
```
products        — id, analysis_id, original_name, cleaned_name, refined_category,
                  price, current_stock, avg_daily_demand, safety_stock_days,
                  reorder_point, supplier_id, ...
suppliers       — id, analysis_id, name, lead_time_days, moq, ...
sales_history   — id, product_id, sale_date, quantity, revenue, ...
forecasts       — id, product_id, forecast_date, predicted_quantity, model_used, ...
recommendations — id, product_id, type, action, urgency, risk_level,
                  estimated_stockout_date, ...
analyses        — id, user_id, status, pipeline_started_at, ...
rate_limits     — id, user_id, message_count, token_count, ...
```

### Tools existentes no AI Assistant
- `get_forecast_analysis` — Previsão de demanda por produto
- `get_supply_chain_analysis` — Reorder points, urgência, MOQ (P1)
- `get_alerts_recommendations` — Alertas e recomendações
- `get_sales_by_month` — Vendas mensais por produto/categoria

---

## 🔧 DECISÕES DE DESIGN PARA P2

- **UI redesign:** Adiado para APÓS P2 completo. Não tocar em layout/design agora.
- **Abstrair fonte de dados:** Tools devem consumir via `dashboard-data.ts`, não direto do CSV adapter (preparação Shopify).
- **Não duplicar lógica:** Se Pareto precisa de dados que supply chain já calcula, reusar `getSupplyChainMetrics()`.
- **Performance:** Queries devem ser eficientes. Uma query com JOINs, cálculos em memória.
