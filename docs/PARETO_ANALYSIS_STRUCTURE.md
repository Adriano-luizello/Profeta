# Análise de Estrutura — Pareto 80/20 de Rentabilidade

**Data:** 2026-02-11  
**Objetivo:** Entender estrutura atual antes de implementar P2 #9 (Pareto 80/20)

---

## 1. Modelo de dados — O que existe para calcular receita/rentabilidade

### Tabela `products`
**Arquivo:** `supabase/migrations/001_initial_schema.sql` (linhas 20-39)

**Campos relacionados a preço/receita:**
```sql
CREATE TABLE public.products (
  id UUID PRIMARY KEY,
  analysis_id UUID REFERENCES analyses(id),
  
  -- Raw data
  original_name TEXT NOT NULL,
  original_category TEXT,
  description TEXT,
  price DECIMAL(10, 2),                    -- ✅ Preço unitário (do CSV)
  
  -- Cleaned data
  cleaned_name TEXT,
  refined_category TEXT,                   -- ✅ Categoria (para agrupar)
  
  -- Supply chain (migration 017)
  current_stock INTEGER,                   -- ✅ Estoque atual (migration 006)
  avg_daily_demand DECIMAL(10, 4),         -- ✅ Demanda média (migration 017)
  safety_stock_days INTEGER DEFAULT 7,
  
  -- Outros
  supplier_id UUID,                        -- ✅ Link para supplier (migration 004)
  sku TEXT,                                -- ✅ SKU (migration 009)
  seasonality TEXT,
  attributes JSONB,
  ai_confidence DECIMAL(3, 2)
)
```

**❌ NÃO EXISTE:**
- Campo de **custo unitário** (unit_cost, cost_price)
- Campo de **margem** (margin, profit_margin)
- Campo de **receita total acumulada** (total_revenue)
- Campo de **quantidade total vendida** (total_sold)

**✅ EXISTE e é utilizável:**
- `price` — Preço unitário do produto
- `refined_category` — Categoria refinada (para agrupamento)
- `current_stock` — Estoque atual em unidades
- `avg_daily_demand` — Demanda diária média (calculada pelo pipeline)

---

### Tabela `sales_history`
**Arquivo:** `supabase/migrations/001_initial_schema.sql` (linhas 42-49)

```sql
CREATE TABLE public.sales_history (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  date DATE NOT NULL,
  quantity INTEGER NOT NULL,              -- ✅ Quantidade vendida
  revenue DECIMAL(10, 2),                 -- ✅ Receita (opcional, mas existe!)
  created_at TIMESTAMPTZ
)
```

**✅ Estrutura PERFEITA para Pareto:**
- `product_id` — Link para produto
- `date` — Data da venda (para filtrar períodos)
- `quantity` — Quantidade vendida
- `revenue` — **Receita da venda** (pode ser preenchido ou calculado como `quantity × price`)

**Como calcular receita por produto:**
```sql
-- Receita total por produto (últimos 90 dias)
SELECT 
  p.id,
  p.cleaned_name,
  p.refined_category,
  COALESCE(SUM(sh.revenue), SUM(sh.quantity * p.price)) AS total_revenue
FROM products p
LEFT JOIN sales_history sh ON sh.product_id = p.id
WHERE sh.date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY p.id
ORDER BY total_revenue DESC;
```

**✅ Período típico:**
- Dados diários (date é DATE, não month)
- Validador recomenda mínimo 90 dias (`lib/csv-adapter/validator.ts:77`)

---

### Tabela `forecasts`
**Arquivo:** `supabase/migrations/001_initial_schema.sql` (linhas 52-61)

```sql
CREATE TABLE public.forecasts (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  forecast_date DATE NOT NULL,
  predicted_quantity DECIMAL(10, 2),      -- ✅ Quantidade prevista
  lower_bound DECIMAL(10, 2),
  upper_bound DECIMAL(10, 2),
  confidence DECIMAL(3, 2)
)
```

**❌ NÃO TEM:**
- Campo `predicted_revenue`
- Campo `price` associado

**✅ MAS PODE CALCULAR:**
```sql
-- Receita prevista = predicted_quantity × product.price
SELECT 
  f.forecast_date,
  f.predicted_quantity * p.price AS predicted_revenue
FROM forecasts f
JOIN products p ON p.id = f.product_id;
```

---

### Tabela `suppliers`
**Arquivo:** `supabase/migrations/004_suppliers.sql` (linhas 6-15)

```sql
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  lead_time_days INTEGER DEFAULT 30,     -- ✅ Lead time
  moq INTEGER DEFAULT 100,                -- ✅ MOQ
  notes TEXT
)
```

**❌ NÃO TEM:**
- Campo de **custo unitário por produto** (unit_cost)
- Link direto `product_id → cost`

**Custo está ausente do sistema atual.** Para calcular margem, precisaria de:
```sql
-- Migration futura (se necessário):
ALTER TABLE products 
  ADD COLUMN unit_cost DECIMAL(10, 2);
```

---

## 2. Analytics existentes — O que já calcula vendas/receita

### Função `getDashboardKpis` em `lib/dashboard-data.ts`

**O que ela calcula hoje:** (linhas 231-472)
```typescript
export async function getDashboardKpis(
  supabase: SupabaseClient,
  userId: string
): Promise<DashboardKpis> {
  // Retorna:
  return {
    produtosEmRisco: number,           // Contagem de produtos em risco
    stockoutsEvitados: number,         // Ações de reorder feitas (90 dias)
    produtosEmRiscoList: ProdutoEmRisco[],  // Lista de produtos em risco
    defaultLeadTimeDays: number,
    defaultMoq: number,
    alertas: AlertaReordenamento[],    // Alertas de reordenamento
    markedRecommendationIds: string[]
  }
}
```

**❌ NÃO calcula:**
- Receita total
- Top products por receita
- Ranking de produtos
- Vendas por categoria

**✅ Calcula apenas:**
- Produtos em risco (supply chain)
- Stockouts evitados (últimos 90 dias)
- Alertas de reordenamento

**Como calcula receita:** **NÃO CALCULA** — Foca em supply chain, não em vendas.

**Retorna dados por produto:** Sim, lista de produtos em risco (`produtosEmRiscoList`)

---

### Função `getSupplyChainMetrics` em `lib/supply-chain.ts`

**O que retorna:** (linhas 15-34)
```typescript
export interface SupplyChainMetrics {
  product_id: string
  product_name: string
  current_stock: number | null           // ✅ Estoque atual
  avg_daily_demand: number | null        // ✅ Demanda média
  lead_time_days: number
  safety_stock_days: number
  safety_stock_units: number | null
  reorder_point: number | null
  days_until_stockout: number | null
  stockout_date: string | null
  urgency_level: 'critical' | 'attention' | 'informative' | 'ok'  // ✅ Urgência
  urgency_reason: string
  moq: number
  recommended_order_qty: number | null
  moq_alert: string | null
  supplier_name: string | null
  supplier_id: string | null
  analysis_id: string
}
```

**✅ Perfeito para cruzamento com Pareto:**
- Retorna dados **por produto**
- Tem `current_stock`, `avg_daily_demand`, `urgency_level`
- Já ordenado por urgência (linhas 127-140)

**❌ NÃO TEM:**
- Receita
- Preço
- Vendas

**Query principal:** (linhas 212-231)
```typescript
const { data: products } = await supabase
  .from('products')
  .select(`
    id, cleaned_name, original_name,
    current_stock, avg_daily_demand, safety_stock_days,
    supplier_id, analysis_id,
    suppliers:supplier_id (id, name, lead_time_days, moq)
  `)
  .eq('analysis_id', analysisId)
  .limit(500)
```

---

### Tools existentes no AI Assistant

**Arquivo:** `lib/ai/tool-definitions.ts` (linhas 1-57)

```typescript
export const TOOL_DEFINITIONS = [
  {
    name: 'get_forecast_analysis',
    description: 'Previsão de demanda com dados históricos e previstos',
    // Retorna: gráfico forecast (vendas + previsão)
  },
  {
    name: 'get_supply_chain_analysis',
    description: 'Análise completa de supply chain: ROP, ruptura, alertas, MOQ',
    // Retorna: tabela de supply chain por produto
  },
  {
    name: 'get_alerts',
    description: 'Alertas de ações necessárias, produtos críticos',
    // Retorna: tabela de alertas
  },
  {
    name: 'get_sales_trend',
    description: 'Tendência de vendas agregadas por mês',
    // Retorna: gráfico de linha (vendas mensais AGREGADAS)
  }
]
```

**❌ Nenhuma tool faz:**
- Ranking de produtos
- Vendas por produto individual
- Análise Pareto 80/20
- Comparação entre produtos

**✅ `get_sales_trend` é o mais próximo:**
- Mas agrega TODAS as vendas (não por produto)
- Retorna vendas mensais totais

---

### Chart data generator

**Arquivo:** `lib/analytics/chart-data-generator.ts` (linhas 16-175)

**Tipos de gráficos/tabelas gerados:**
```typescript
export type ChartType = 'forecast' | 'line' | 'bar' | 'table'

export type ChartQuery =
  | { type: 'forecast'; days?: number }        // Gráfico forecast (vendas + previsão)
  | { type: 'line'; days?: number }            // Linha de vendas mensais AGREGADAS
  | { type: 'supply_chain'; urgency_filter? }  // Tabela supply chain
  | { type: 'alertas' }                        // Tabela de alertas
```

**Switch/case organizado:** (linhas 157-175)
```typescript
export async function generateChartData(
  supabase: SupabaseClient,
  userId: string,
  query: ChartQuery
): Promise<ChartOutput | null> {
  switch (query.type) {
    case 'forecast':
      return forecastChart(supabase, userId, days)
    case 'line':
      return lineChart(supabase, userId, days)      // Vendas agregadas
    case 'supply_chain':
      return supplyChainTable(supabase, userId, query.urgency_filter)
    case 'alertas':
      return alertasTable(supabase, userId)
    default:
      return null
  }
}
```

**❌ Não existe:**
- Gráfico de barras por produto
- Ranking de produtos
- Tabela de vendas por produto

---

## 3. Dashboard — Componentes visuais existentes

### Página principal do dashboard

**Arquivo:** `app/dashboard/page.tsx` (linhas 1-103)

**Componentes/widgets existentes:**
```typescript
return (
  <DashboardAnalysisView
    analysis={{ id, file_name, total_products, created_at }}
    products={products}  // Lista de produtos (id, name, category, sku)
    forecast={forecast}  // Dados de forecast
    analysisId={analysisId}
  />
)
```

**DashboardAnalysisView renderiza:**
- `AnalysisHeader` — Cabeçalho (nome, data, total produtos)
- `AnalysisSummaryCards` — KPIs (produtosEmRisco, stockoutsEvitados)
- **Tabs:**
  - `GeneralTab` — Gráfico vendas + forecast, alertas, recomendações
  - `ProductsTab` — Lista de produtos com cards

**Componentes disponíveis:** (pasta `components/dashboard/analysis/`)
- `TopProductsCard.tsx` ✅
- `WorstProductsCard.tsx` ✅
- `AlertsCard.tsx` ✅
- `RecommendationsSection.tsx` ✅
- `ProductCard.tsx` — Card individual de produto
- `ProductDetailDialog.tsx` — Detalhes de um produto

**❌ Não existe:**
- Gráfico de barras de ranking
- Tabela Pareto 80/20
- Widget de rentabilidade

**✅ Existe TopProductsCard:**
- Pode ser adaptado para mostrar top por receita
- Atual: não está claro o que mostra (precisa investigar)

---

### Como os dados chegam no dashboard?

**Fluxo:**
```
1. app/dashboard/page.tsx (Server Component)
   ↓
2. await getLatestAnalysisWithDetails(supabase, userId)
   ↓
3. lib/dashboard-data.ts → Query ao Supabase
   ↓
4. Retorna dados para <DashboardAnalysisView>
   ↓
5. Client Components consomem os dados
```

**Tipo de fetch:**
- **Server Component** (página principal)
- Usa `createClient()` do server
- Dados chegam via props para client components

**API routes são usadas para:**
- Chat (`/api/chat/route.ts`)
- Alert actions (`/api/alert-actions/route.ts`)
- Pipeline (`/api/analyses/[id]/pipeline/route.ts`)

---

## 4. Dados disponíveis para Pareto — Viabilidade

| Dado necessário | Status | Como obter |
|-----------------|--------|------------|
| **Receita por produto** | ✅ CALCULÁVEL | `SUM(sales_history.revenue)` OU `SUM(quantity × products.price)` por `product_id` |
| **Receita por categoria** | ✅ CALCULÁVEL | JOIN `products.refined_category`, agrupar receita |
| **Custo por produto** | ❌ NÃO EXISTE | Precisaria adicionar campo `unit_cost` em products |
| **Current stock por produto** | ✅ EXISTE | Campo `products.current_stock` (migration 006) |
| **Preço unitário por produto** | ✅ EXISTE | Campo `products.price` |
| **Supply chain metrics por produto** | ✅ EXISTE | `getSupplyChainMetrics()` retorna por produto |
| **Forecast por produto** | ✅ EXISTE | Tabela `forecasts` com `predicted_quantity` |

**✅ VIÁVEL para implementar Pareto 80/20 COMPLETO**, exceto margem (que precisa de custo).

**Cálculos possíveis:**
```sql
-- Receita por produto (90 dias)
SELECT 
  p.id, 
  p.cleaned_name,
  p.refined_category,
  COALESCE(SUM(sh.revenue), SUM(sh.quantity * p.price)) AS total_revenue,
  SUM(sh.quantity) AS total_quantity,
  p.current_stock,
  p.current_stock * p.price AS capital_preso
FROM products p
LEFT JOIN sales_history sh ON sh.product_id = p.id
WHERE sh.date >= CURRENT_DATE - INTERVAL '90 days'
  AND p.analysis_id = :analysisId
GROUP BY p.id
ORDER BY total_revenue DESC;

-- Top 20% = LIMIT (total_count * 0.2)
```

---

## 5. Padrão de implementação — Como as tools anteriores foram feitas

### Fluxo completo de uma tool (ex: `get_supply_chain_analysis`)

**1. Tool definition** → `lib/ai/tool-definitions.ts` (linhas 17-36)
```typescript
{
  name: 'get_supply_chain_analysis',
  description: 'Retorna análise completa de supply chain: reorder points...',
  input_schema: {
    type: 'object',
    properties: {
      urgency_filter: {
        type: 'string',
        enum: ['all', 'critical', 'attention'],
        description: 'Filtrar por nível de urgência. Default: all.'
      }
    },
    required: []
  }
}
```

**2. Handler** → `app/api/chat/route.ts` (linhas 21-41)
```typescript
function toolToChartQuery(toolName: string, toolInput: unknown): ChartQuery | null {
  switch (toolName) {
    case 'get_supply_chain_analysis':
      return { type: 'supply_chain', urgency_filter: input?.urgency_filter }
    // ... outros cases
  }
}

// No loop principal (linha 125+):
while (response.stop_reason === 'tool_use') {
  const toolUse = response.content.find(block => block.type === 'tool_use')
  const chartQuery = toolToChartQuery(toolUse.name, toolUse.input)
  
  if (chartQuery) {
    const result = await generateChartData(supabase, user.id, chartQuery)
    chartOutput = result
  }
}
```

**3. Chart data generator** → `lib/analytics/chart-data-generator.ts` (linhas 93-120)
```typescript
async function supplyChainTable(
  supabase: SupabaseClient,
  userId: string,
  urgencyFilter?: string
): Promise<ChartOutput> {
  const metrics = await getSupplyChainMetrics(supabase, userId)  // ← Dashboard data
  
  const filtered = urgencyFilter && urgencyFilter !== 'all'
    ? metrics.filter(m => m.urgency_level === urgencyFilter)
    : metrics
  
  const rows = filtered.map(m => ({
    produto: m.product_name,
    estoque_atual: m.current_stock != null ? String(m.current_stock) : '—',
    dias_ate_ruptura: m.days_until_stockout != null ? `${m.days_until_stockout} dias` : '—',
    // ... mais campos
  }))
  
  return { chartType: 'table', chartData: rows }
}
```

**4. Dashboard data** → `lib/supply-chain.ts` (linhas 200-310)
```typescript
export async function getSupplyChainMetrics(
  supabase: SupabaseClient,
  userId: string
): Promise<SupplyChainMetrics[]> {
  const analysisId = await getLatestAnalysis(supabase, userId)
  
  const { data: products } = await supabase
    .from('products')
    .select('id, cleaned_name, current_stock, avg_daily_demand, ...')
    .eq('analysis_id', analysisId)
  
  // Cálculos em memória (ROP, urgency, etc.)
  const metrics = products.map(product => {
    const reorderPoint = avgDemand * leadTime + safetyStock
    const urgency = calculateUrgency(daysUntilStockout, leadTime)
    return { ...product, reorderPoint, urgency, ... }
  })
  
  return metrics.sort(sortByUrgency)
}
```

**5. Retorno para o chat** → formato `ChartOutput`:
```typescript
{
  chartType: 'table',  // ou 'forecast', 'line', 'bar'
  chartData: [
    { produto: 'Produto A', estoque_atual: '100', urgencia: '🔴 Crítico', ... },
    { produto: 'Produto B', estoque_atual: '50', urgencia: '🟡 Atenção', ... }
  ]
}
```

**Chat renderiza tabela automaticamente** (componente no frontend já existe).

---

### Como criar uma NOVA tool?

**Passo a passo:**

**1. Registrar a tool** → `lib/ai/tool-definitions.ts`
```typescript
{
  name: 'get_pareto_analysis',
  description: 'Análise Pareto 80/20: ranking de produtos por receita...',
  input_schema: {
    type: 'object',
    properties: {
      period_days: { type: 'number', description: 'Período em dias (default: 90)' },
      view: { 
        type: 'string', 
        enum: ['products', 'categories', 'at_risk'],
        description: 'Visão: produtos, categorias ou produtos top em risco'
      }
    },
    required: []
  }
}
```

**2. Implementar lógica de dados** → `lib/dashboard-data.ts` (NOVO)
```typescript
export async function getParetoMetrics(
  supabase: SupabaseClient,
  userId: string,
  periodDays: number = 90
): Promise<ParetoMetrics[]> {
  const analysisId = await getLatestAnalysis(supabase, userId)
  
  // Query: receita por produto
  const { data } = await supabase
    .from('products')
    .select(`
      id, cleaned_name, refined_category, price, current_stock,
      sales_history!inner(quantity, revenue, date)
    `)
    .eq('analysis_id', analysisId)
    .gte('sales_history.date', cutoffDate)
  
  // Calcular receita, % acumulado, capital preso
  // Ordenar por receita desc
  // Marcar top 20%
  
  return paretoData
}
```

**3. Gerar dados para gráfico** → `lib/analytics/chart-data-generator.ts` (NOVO case)
```typescript
async function paretoTable(
  supabase: SupabaseClient,
  userId: string,
  view: string
): Promise<ChartOutput> {
  const metrics = await getParetoMetrics(supabase, userId)
  
  if (view === 'products') {
    return { chartType: 'table', chartData: metrics.map(m => ({
      produto: m.product_name,
      receita: formatCurrency(m.revenue),
      contribuicao_pct: `${m.contribution_pct}%`,
      top_20: m.is_top_20 ? '⭐ Top 20%' : '—',
      // ...
    }))}
  }
  
  // ... outros views
}

// Adicionar case no switch:
export async function generateChartData(...) {
  switch (query.type) {
    // ... cases existentes
    case 'pareto':
      return paretoTable(supabase, userId, query.view)
  }
}
```

**4. Conectar ao handler** → `app/api/chat/route.ts`
```typescript
function toolToChartQuery(toolName: string, toolInput: unknown): ChartQuery | null {
  switch (toolName) {
    // ... cases existentes
    case 'get_pareto_analysis':
      const input = toolInput as { period_days?: number; view?: string }
      return { 
        type: 'pareto', 
        period_days: input?.period_days ?? 90,
        view: input?.view ?? 'products'
      }
  }
}
```

**5. Atualizar tipos** → `lib/analytics/chart-data-generator.ts`
```typescript
export type ChartQuery =
  | { type: 'forecast'; days?: number }
  | { type: 'line'; days?: number }
  | { type: 'supply_chain'; urgency_filter?: string }
  | { type: 'alertas' }
  | { type: 'pareto'; period_days?: number; view?: string }  // ← NOVO
```

**Pronto!** O chat já saberá invocar a tool e renderizar a tabela.

---

## 6. Resumo — Tabela de estado atual

| Aspecto | Estado atual | O que falta para Pareto 80/20 |
|---------|-------------|-------------------------------|
| **Receita por produto** | ❌ Não calculado | ✅ FÁCIL: `SUM(sales_history.revenue)` por `product_id` |
| **Receita por categoria** | ❌ Não calculado | ✅ FÁCIL: JOIN `products.refined_category`, agrupar |
| **Margem/custo por produto** | ❌ Campo não existe | ⚠️ OPCIONAL: Adicionar `unit_cost` em products (migration) |
| **Ranking de produtos** | ❌ Não existe | ✅ FÁCIL: ORDER BY receita DESC, calcular % acumulado |
| **Capital preso (stock × price)** | ❌ Não calculado | ✅ FÁCIL: `current_stock * price` |
| **Cruzamento com supply chain** | ✅ `getSupplyChainMetrics()` existe | ✅ TRIVIAL: JOIN por `product_id` |
| **Tool no AI Assistant** | ❌ Não existe | ✅ MÉDIO: Criar `get_pareto_analysis` (2h) |
| **Gráfico/widget no dashboard** | ❌ Não existe | ⚠️ OPCIONAL: Pode usar só o chat |

**Esforço estimado para MVP do Pareto:**
- ✅ **Backend (queries + lógica):** 2-3 horas
- ✅ **Tool no AI Assistant:** 1-2 horas
- ✅ **Testing:** 1 hora
- **Total MVP:** ~4-6 horas

**Funcionalidades MVP:**
1. Ranking top 20% produtos por receita (90 dias)
2. % contribuição acumulada
3. Cruzamento: "Top 20% em risco" (urgência critical/attention)
4. Cruzamento: "Bottom 20% com capital preso" (estoque × preço)
5. Agrupamento por categoria

---

## 7. Arquivos-chave para examinar (ordem de importância)

1. **`lib/dashboard-data.ts`** (473 linhas)
   - Contém todas as queries principais
   - Patterns: `getLatestAnalysis()`, `getProductIds()`, `getSalesByDate()`
   - Aqui vai a nova função `getParetoMetrics()`

2. **`lib/analytics/chart-data-generator.ts`** (176 linhas)
   - Conecta tools → dados → formatação
   - Aqui vai a nova função `paretoTable()` + case no switch

3. **`lib/ai/tool-definitions.ts`** (57 linhas)
   - Registra tools disponíveis para Claude
   - Aqui vai a definição de `get_pareto_analysis`

4. **`app/api/chat/route.ts`** (217 linhas)
   - Handler que processa tool calls
   - Aqui vai o case `get_pareto_analysis` no `toolToChartQuery()`

5. **`supabase/migrations/001_initial_schema.sql`** (215 linhas)
   - Schema das tabelas principais
   - Entender estrutura de `products`, `sales_history`

6. **`lib/supply-chain.ts`** (310 linhas)
   - Referência de como fazer queries complexas
   - Pattern: JOIN products + suppliers, cálculos em memória
   - Usar para cruzar Pareto com supply chain

7. **`components/dashboard/analysis/TopProductsCard.tsx`**
   - Ver se já existe lógica de ranking
   - Pode ser adaptado para mostrar Pareto no dashboard (futuro)

---

## 8. Query SQL de referência para Pareto

```sql
-- Pareto 80/20: Receita por produto (últimos 90 dias)
WITH product_revenue AS (
  SELECT 
    p.id AS product_id,
    p.cleaned_name AS product_name,
    p.refined_category,
    p.current_stock,
    p.price,
    p.avg_daily_demand,
    COALESCE(SUM(sh.revenue), SUM(sh.quantity * p.price)) AS total_revenue,
    SUM(sh.quantity) AS total_quantity,
    p.current_stock * p.price AS capital_preso
  FROM products p
  LEFT JOIN sales_history sh ON sh.product_id = p.id
  WHERE p.analysis_id = :analysisId
    AND sh.date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY p.id
),
ranked AS (
  SELECT 
    *,
    SUM(total_revenue) OVER () AS grand_total,
    ROW_NUMBER() OVER (ORDER BY total_revenue DESC) AS rank,
    SUM(total_revenue) OVER (ORDER BY total_revenue DESC) AS cumulative_revenue
  FROM product_revenue
  WHERE total_revenue > 0
)
SELECT 
  product_id,
  product_name,
  refined_category,
  total_revenue,
  ROUND((total_revenue / grand_total * 100)::numeric, 2) AS contribution_pct,
  ROUND((cumulative_revenue / grand_total * 100)::numeric, 2) AS cumulative_pct,
  rank,
  CASE WHEN cumulative_pct <= 80 THEN true ELSE false END AS is_top_80,
  current_stock,
  capital_preso,
  avg_daily_demand
FROM ranked
ORDER BY rank;
```

**Cruzamento com supply chain:**
```typescript
// Em getParetoMetrics():
const paretoData = /* query acima */
const supplyChainMetrics = await getSupplyChainMetrics(supabase, userId)

// Merge por product_id
const merged = paretoData.map(p => {
  const sc = supplyChainMetrics.find(s => s.product_id === p.product_id)
  return {
    ...p,
    urgency_level: sc?.urgency_level,
    days_until_stockout: sc?.days_until_stockout,
    is_at_risk: sc?.urgency_level === 'critical' || sc?.urgency_level === 'attention'
  }
})

// Filtros:
const topSellersAtRisk = merged.filter(m => m.is_top_80 && m.is_at_risk)
const bottomSellersHighStock = merged.filter(m => !m.is_top_80 && m.capital_preso > threshold)
```

---

## Conclusão

**✅ Sistema está PRONTO para Pareto 80/20:**
- Dados de receita existem (`sales_history.revenue` ou calculável)
- Estrutura de supply chain já existe (pode cruzar)
- Pattern de tools está bem definido
- Infra de chat + tabelas já funciona

**⚠️ Limitações:**
- Margem/lucro requer adicionar campo `unit_cost` (futuro)
- Dashboard visual é opcional (chat é suficiente para MVP)

**🎯 Próximo passo:**
Implementar seguindo o pattern documentado acima.
