# Supply Chain Intelligence - Reorder Point + MOQ

## Visão Geral

Implementação de um sistema inteligente de supply chain que calcula métricas em tempo real para recomendações precisas de reordenamento, considerando:

- **Reorder Point (ROP)**: Ponto ideal para fazer pedido
- **Days until stockout**: Quantos dias até ruptura de estoque
- **Urgency levels**: Hierarquia de urgência (critical/attention/informative/ok)
- **MOQ alerts**: Alertas quando MOQ não é adequado ao consumo
- **Recommended order quantity**: Quanto pedir considerando consumo e MOQ

## Arquitetura Híbrida

### Python (Pipeline Time)
Calcula e persiste `avg_daily_demand` por produto durante o pipeline de forecast.

**Arquivo**: `profeta-forecaster/models/forecaster.py`
- Método `_calculate_and_persist_avg_daily_demand()` (linha ~1115)
- Chamado após gerar forecasts (linha ~449)

**Lógica**:
- Se forecast é diário: `avg_daily_demand = total_previsto / número_de_dias`
- Se forecast é mensal: `avg_daily_demand = total_previsto / dias_no_período`

### TypeScript (Request Time)
Calcula métricas em tempo real usando `avg_daily_demand` + dados atuais de estoque.

**Arquivo**: `lib/supply-chain.ts`
- Função `getSupplyChainMetrics()` - calcula todas as métricas
- Funções auxiliares: `calculateUrgency()`, `generateMoqAlert()`

**Métricas calculadas**:
```typescript
- safety_stock_units = avg_daily_demand × safety_stock_days
- reorder_point = (avg_daily_demand × lead_time_days) + safety_stock_units
- days_until_stockout = current_stock / avg_daily_demand
- stockout_date = hoje + days_until_stockout
- urgency_level: critical | attention | informative | ok
- recommended_order_qty = max(consumo_90d - estoque_atual, moq)
```

## Modelo de Dados

### Nova Migration: `017_supply_chain_fields.sql`

```sql
-- avg_daily_demand: calculado pelo Python durante o pipeline
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS avg_daily_demand DECIMAL(10, 4);

-- safety_stock_days: configurável pelo usuário (default 7)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS safety_stock_days INTEGER DEFAULT 7;
```

### Campos Existentes (já disponíveis)
- `products.current_stock` — INTEGER
- `suppliers.lead_time_days` — INTEGER (default 30)
- `suppliers.moq` — INTEGER (default 100)

## Lógica de Urgência

### Critical (🔴)
- Estoque = 0
- `days_until_stockout < lead_time` (ruptura inevitável mesmo pedindo hoje)

**Exemplo**: Produto com 5 dias de estoque, lead time de 15 dias → ficará 10 dias sem estoque

### Attention (🟡)
- `lead_time ≤ days_until_stockout < lead_time + 7`
- Janela de pedido está fechando

**Exemplo**: Produto com 18 dias de estoque, lead time de 15 dias → tem 3 dias para decidir

### Informative (🔵)
- `lead_time + 7 ≤ days_until_stockout < lead_time + 14`
- Estoque confortável, mas requer monitoramento

### OK (🟢)
- `days_until_stockout ≥ lead_time + 14`
- Situação confortável

## MOQ Alerts

### Alerta Tipo 1: MOQ maior que necessidade
```
"MOQ é 500, mas você só precisa de 200 un.
Comprar 500 = ~3 meses de estoque.
Considere negociar MOQ menor ou aceitar o excesso."
```

### Alerta Tipo 2: MOQ maior que consumo 90d
```
"MOQ (500) é maior que seu consumo de 90 dias (300).
O pedido mínimo cobre ~4 meses."
```

## Tool do AI Assistant

### `get_supply_chain_analysis`

**Antes:**
```typescript
{
  name: 'get_supply_chain_analysis',
  description: 'Retorna análise de supply chain com produtos em risco...',
  input_schema: {
    properties: {},
    required: []
  }
}
```

**Depois:**
```typescript
{
  name: 'get_supply_chain_analysis',
  description: 'Retorna análise completa: reorder points, projeção de ruptura, ' +
               'alertas hierárquicos, situação de MOQ, recomendações...',
  input_schema: {
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

## Chart Data Generator

**Arquivo**: `lib/analytics/chart-data-generator.ts`

### Saída da Tool (Tabela)
Quando o usuário pergunta sobre supply chain no chat, a tool retorna uma tabela com:

| Campo | Descrição |
|-------|-----------|
| `produto` | Nome do produto |
| `estoque_atual` | Estoque atual em unidades |
| `dias_ate_ruptura` | Dias até ruptura |
| `data_ruptura` | Data estimada de ruptura (YYYY-MM-DD) |
| `reorder_point` | Ponto de reordenamento (ROP) |
| `urgencia` | 🔴 Crítico / 🟡 Atenção / 🔵 Informativo / 🟢 OK |
| `motivo` | Razão da urgência |
| `quantidade_sugerida` | Quantidade sugerida para pedido |
| `moq_alerta` | Alerta sobre MOQ se aplicável |
| `fornecedor` | Nome do fornecedor |
| `lead_time` | Lead time em dias |

## Dashboard KPIs

**Arquivo**: `lib/dashboard-data.ts`

### Retrocompatibilidade
A função `getDashboardKpis()` agora:
1. **Tenta** usar as novas métricas de supply chain (`getSupplyChainMetrics`)
2. **Fallback** para o sistema antigo (recommendations) se `avg_daily_demand` não estiver disponível

### KPIs Atualizados
- **Produtos em Risco**: Conta produtos com `urgency_level != 'ok'`
- **Lista de Produtos em Risco**: Usa supply chain metrics quando disponível
- **Alertas**: Filtra `critical` e `attention` apenas

## Componentes UI

Os componentes existentes (`AlertasReordenamento.tsx`, `SupplyChainIntelligenceTable.tsx`) **não precisam mudar**. Eles consomem os tipos existentes (`ProdutoEmRisco`, `AlertaReordenamento`) que são preenchidos pelas novas métricas com mapeamento de compatibilidade.

## Como Testar

### 1. Aplicar Migration
```bash
# No Supabase SQL Editor, executar:
supabase/migrations/017_supply_chain_fields.sql
```

### 2. Rodar Pipeline de Forecast
```bash
cd profeta-forecaster
python -m main  # ou via API: POST /forecast
```

**Verificar logs:**
```
📊 Calculando avg_daily_demand por produto...
  Produto A: avg_daily_demand = 2.5000 un/dia
  Produto B: avg_daily_demand = 10.3500 un/dia
💾 Persistindo avg_daily_demand para 50 produtos...
✅ avg_daily_demand persistido: 50 produtos
```

### 3. Verificar no Banco
```sql
SELECT 
  cleaned_name, 
  current_stock, 
  avg_daily_demand, 
  safety_stock_days 
FROM products 
WHERE avg_daily_demand IS NOT NULL
LIMIT 10;
```

### 4. Testar no Dashboard
```bash
npm run dev
```

Acessar `/dashboard` e verificar:
- KPI "Produtos em Risco" atualizado
- Alertas de Reordenamento com urgência correta
- Supply Chain Intelligence com ROP e projeções

### 5. Testar no Chat
No chat do dashboard, perguntar:
- "Quais produtos estão em risco?"
- "Mostre a análise de supply chain"
- "Produtos críticos" (com filtro `urgency_filter: 'critical'`)

Verificar se a tabela retorna:
- Dias até ruptura
- Reorder point
- Urgência com emoji
- Alertas de MOQ

## Próximos Passos (Futuro)

### Fase 2 - Safety Stock Estatístico
Substituir `safety_stock_days` fixo por cálculo baseado em:
- Desvio padrão da demanda (`σ`)
- Z-score do nível de serviço desejado (95%, 99%)
- Fórmula: `safety_stock = Z × σ × √lead_time`

### Fase 3 - Consolidação de Pedidos
Agrupar produtos por `supplier_id` e sugerir:
```
"Fornecedor XYZ: 5 produtos em risco
Pedido consolidado sugerido: 1200 unidades
Economize frete pedindo junto"
```

### Fase 4 - Timeline Visual
Criar gráfico de projeção de estoque:
- Linha de estoque atual → ruptura
- Marca de chegada do pedido (hoje + lead_time)
- Zona de safety stock destacada

### Fase 5 - Shopify Integration
Quando integrar com Shopify API:
- Estoque atualiza via webhook → métricas refletem em tempo real
- Não precisa re-rodar pipeline para ver mudanças
- Supply chain sempre atualizado

## Observações Técnicas

### Performance
- `getSupplyChainMetrics()` faz **uma query** ao banco (products + suppliers JOIN)
- Calcula tudo em memória
- Suporta até 500 produtos sem problema de performance
- Ordenação por urgência (critical primeiro)

### Defaults
- `safety_stock_days`: 7 (configurável por produto)
- `lead_time_days`: 30 (configurável por fornecedor, fallback org settings)
- `moq`: 100 (configurável por fornecedor, fallback org settings)

### Tratamento de Nulls
- Se `avg_daily_demand` é `null` → `urgency_level = 'ok'` + reasoning "Dados insuficientes"
- Se `current_stock` é `null` → não calcula days_until_stockout
- Se `supplier_id` é `null` → usa defaults da organização

## Changelog

### 2026-02-07 - v1.0.0 - Supply Chain Intelligence
- ✅ Migration 017: `avg_daily_demand`, `safety_stock_days`
- ✅ Python: Cálculo e persistência de `avg_daily_demand`
- ✅ TypeScript: `lib/supply-chain.ts` com métricas em tempo real
- ✅ Chart generator: Tabela expandida com ROP, urgência, MOQ alerts
- ✅ Tool: `get_supply_chain_analysis` com filtro de urgência
- ✅ Dashboard: Retrocompatibilidade com recommendations antigas
- ✅ Lógica de urgência: 4 níveis (critical/attention/informative/ok)
- ✅ MOQ alerts: Detecta quando MOQ não é adequado
