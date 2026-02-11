# Guia de Teste — Observabilidade e Logging de Custos (P2 #12)

## O que foi implementado

**Sistema de tracking de consumo de tokens e custos** para calcular quanto cada usuário custa antes de definir pricing.

### Pontos instrumentados:

1. **Claude (Chat)**: Registra consumo a cada mensagem (incluindo tool calls)
2. **GPT-4 (Limpeza)**: Registra consumo total da limpeza de dados

---

## Migration aplicada

**`020_usage_logs.sql`**: Nova tabela `usage_logs`

**Estrutura:**
- `user_id`: Quem gerou o custo
- `service`: `'claude_chat'` | `'gpt4_cleaning'` | `'gpt4_forecast'`
- `input_tokens`, `output_tokens`: Tokens consumidos
- `total_tokens`: Soma (coluna gerada)
- `estimated_cost_cents`: Custo estimado em centavos de USD
- `model`: Modelo usado ('claude-3-5-sonnet-20241022', 'gpt-4o-mini', etc.)
- `metadata`: JSON com dados extras (tool_name, product_count, etc.)
- `analysis_id`: Referência à análise (null para chat)
- `created_at`: Timestamp

**RLS:**
- Usuários podem ver apenas seus próprios logs
- Service role pode inserir logs
- Logs são imutáveis (nenhum UPDATE/DELETE)

---

## Arquivos criados/modificados

1. **`supabase/migrations/020_usage_logs.sql`** (NEW)
   - Tabela `usage_logs` com 3 índices
   - RLS policies
   - Comentários de documentação

2. **`lib/usage-logger.ts`** (NEW)
   - Interface `UsageLogEntry`
   - Interface `UsageSummary`
   - Função `logUsage()` — Registra uso (fire and forget)
   - Função `getUserUsageSummary()` — Busca resumo de consumo
   - Constantes `COST_PER_MILLION` para todos os modelos
   - Helper `estimateCostCents()` — Calcula custo estimado

3. **`app/api/chat/route.ts`**
   - Import `logUsage`
   - Logging após primeira chamada ao Claude (linha ~143)
   - Logging após cada tool call (linha ~196)
   - Metadata: `initial_call`, `tool_used`, `has_chart`

4. **`lib/services/run-clean.ts`**
   - Import `logUsage`
   - Logging após `cleanProducts()` retornar (linha ~70)
   - Agrega tokens de todos os produtos limpos em um único log
   - Metadata: `product_count`, `processing_time_ms`, qualidade dos dados

---

## Como testar

### Teste 1: Logging do Chat (Claude)

**Passo 1**: Acessar http://localhost:3001/dashboard

**Passo 2**: Enviar mensagem simples no chat:
```
Oi
```

**Passo 3**: Verificar no Supabase que um registro foi criado:

```sql
SELECT 
  service,
  model,
  input_tokens,
  output_tokens,
  total_tokens,
  estimated_cost_cents,
  metadata,
  created_at
FROM usage_logs
WHERE service = 'claude_chat'
ORDER BY created_at DESC
LIMIT 5;
```

**Resultado esperado**:
- ✅ 1 registro com `service = 'claude_chat'`
- ✅ `input_tokens` > 0 (mensagem + system prompt)
- ✅ `output_tokens` > 0 (resposta do Claude)
- ✅ `estimated_cost_cents` > 0 (custo estimado)
- ✅ `model` = 'claude-3-5-sonnet-20241022' (ou similar)
- ✅ `metadata.initial_call` = true

---

### Teste 2: Logging com Tool Call (Claude)

**Passo 1**: Enviar mensagem que aciona uma tool:
```
Qual a velocidade de giro do meu estoque?
```

**Passo 2**: Verificar no Supabase:

```sql
SELECT 
  service,
  metadata->>'tool_used' as tool,
  metadata->>'has_chart' as has_chart,
  input_tokens,
  output_tokens,
  estimated_cost_cents
FROM usage_logs
WHERE service = 'claude_chat'
ORDER BY created_at DESC
LIMIT 10;
```

**Resultado esperado**:
- ✅ **2+ registros** (um para cada chamada ao Claude):
  1. Primeira chamada: `initial_call = true`, tool escolhida
  2. Segunda chamada: `tool_used = 'get_turnover_analysis'`, `has_chart = true`
- ✅ Ambos com tokens e custos > 0

---

### Teste 3: Logging da Limpeza (GPT-4)

**Passo 1**: Fazer upload de um CSV em http://localhost:3001/dashboard/upload

**Passo 2**: Aguardar o pipeline completar

**Passo 3**: Verificar no Supabase:

```sql
SELECT 
  service,
  model,
  input_tokens,
  output_tokens,
  estimated_cost_cents,
  metadata->>'product_count' as products,
  metadata->>'processing_time_ms' as time_ms,
  analysis_id,
  created_at
FROM usage_logs
WHERE service = 'gpt4_cleaning'
ORDER BY created_at DESC
LIMIT 5;
```

**Resultado esperado**:
- ✅ 1 registro com `service = 'gpt4_cleaning'`
- ✅ `model` = 'gpt-4o-mini'
- ✅ `input_tokens` e `output_tokens` > 0 (agregado de todos os produtos)
- ✅ `metadata.product_count` = número de produtos limpos
- ✅ `metadata.processing_time_ms` > 0
- ✅ `analysis_id` aponta para a análise

---

### Teste 4: Resumo de Custos (Query SQL)

```sql
-- Total de custos por usuário (últimos 30 dias)
SELECT 
  user_id,
  COUNT(*) as total_calls,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(estimated_cost_cents) as total_cost_cents,
  SUM(estimated_cost_cents) / 100.0 as total_cost_usd,
  SUM(estimated_cost_cents) / 100.0 * 5.0 as total_cost_brl  -- Taxa: 1 USD = 5 BRL
FROM usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_cost_cents DESC;

-- Custos por serviço (últimos 30 dias)
SELECT 
  service,
  COUNT(*) as calls,
  SUM(total_tokens) as total_tokens,
  SUM(estimated_cost_cents) as total_cost_cents,
  SUM(estimated_cost_cents) / 100.0 as total_cost_usd
FROM usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY service
ORDER BY total_cost_cents DESC;

-- Custos por análise (limpeza GPT-4)
SELECT 
  a.id,
  a.file_name,
  a.total_products,
  ul.input_tokens,
  ul.output_tokens,
  ul.estimated_cost_cents,
  ul.estimated_cost_cents / 100.0 as cost_usd,
  ul.metadata->>'processing_time_ms' as time_ms
FROM analyses a
LEFT JOIN usage_logs ul ON ul.analysis_id = a.id AND ul.service = 'gpt4_cleaning'
ORDER BY a.created_at DESC
LIMIT 10;
```

**Resultado esperado**:
- ✅ Dados agregados por usuário/serviço
- ✅ Custos calculados corretamente (cents → USD → BRL)
- ✅ Totais conferem com registros individuais

---

### Teste 5: Função Helper `getUserUsageSummary()`

**Adicionar rota temporária para testar** (ou usar em console do Node):

```typescript
// Em app/api/usage-summary/route.ts (temporário)
import { createClient } from '@/lib/supabase/server'
import { getUserUsageSummary } from '@/lib/usage-logger'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const summary = await getUserUsageSummary(supabase, user.id, 30)
  return NextResponse.json(summary)
}
```

**Acessar**: http://localhost:3001/api/usage-summary

**Resultado esperado**:
```json
{
  "totalTokens": 12543,
  "totalCostCents": 234,
  "totalCostBRL": "R$ 11,70",
  "byService": [
    {
      "service": "claude_chat",
      "tokens": 10234,
      "costCents": 198,
      "count": 5
    },
    {
      "service": "gpt4_cleaning",
      "tokens": 2309,
      "costCents": 36,
      "count": 1
    }
  ],
  "periodDays": 30,
  "dailyAvgCostCents": 7
}
```

---

## Checklist de validação

### Funcionalidade
- [ ] Chat (Claude) loga uso a cada mensagem
- [ ] Chat com tool call loga múltiplas chamadas
- [ ] Limpeza (GPT-4) loga uso após processar produtos
- [ ] Logs aparecem no Supabase em `usage_logs`
- [ ] RLS permite usuário ver apenas seus próprios logs

### Dados
- [ ] `input_tokens` e `output_tokens` > 0
- [ ] `total_tokens` = input + output (coluna gerada)
- [ ] `estimated_cost_cents` > 0 e realista
- [ ] `model` corresponde ao modelo usado
- [ ] `metadata` contém dados extras (tool_name, product_count, etc.)
- [ ] `analysis_id` correto para limpeza, null para chat

### Performance
- [ ] Logging NÃO atrasa resposta do chat
- [ ] Logging NÃO atrasa pipeline de limpeza
- [ ] Se logging falhar, chat/pipeline continua normalmente
- [ ] Nenhum await no caminho crítico (fire and forget)

### Custos
- [ ] Custo de Claude calculado corretamente ($3/$15 per M)
- [ ] Custo de GPT-4o-mini calculado corretamente ($0.15/$0.60 per M)
- [ ] Conversão USD → BRL usando taxa fixa (1 USD = 5 BRL)
- [ ] Resumo agregado confere com registros individuais

---

## Queries úteis para análise de custos

### Custo médio por usuário (últimos 30 dias)
```sql
SELECT 
  AVG(total_cost_cents) / 100.0 as avg_cost_usd_per_user,
  COUNT(DISTINCT user_id) as total_users,
  SUM(estimated_cost_cents) / 100.0 as total_cost_usd
FROM (
  SELECT user_id, SUM(estimated_cost_cents) as total_cost_cents
  FROM usage_logs
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY user_id
) subquery;
```

### Top 10 usuários por custo
```sql
SELECT 
  user_id,
  COUNT(*) as total_calls,
  SUM(total_tokens) as total_tokens,
  SUM(estimated_cost_cents) / 100.0 as total_cost_usd,
  ROUND((SUM(estimated_cost_cents) / 100.0 * 5.0)::numeric, 2) as total_cost_brl
FROM usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_cost_cents DESC
LIMIT 10;
```

### Custos por hora do dia (encontrar picos de uso)
```sql
SELECT 
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as calls,
  SUM(estimated_cost_cents) / 100.0 as cost_usd
FROM usage_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour;
```

### Custo médio por chamada ao chat vs limpeza
```sql
SELECT 
  service,
  COUNT(*) as calls,
  AVG(estimated_cost_cents) / 100.0 as avg_cost_usd_per_call,
  SUM(estimated_cost_cents) / 100.0 as total_cost_usd
FROM usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY service;
```

---

## Interpretação de resultados

### Custo típico esperado:

**Chat (Claude 3.5 Sonnet)**:
- Mensagem simples: ~1.000-2.000 tokens = $0.01-$0.03 (1-3 centavos)
- Mensagem com tool call: ~5.000-10.000 tokens = $0.05-$0.15 (5-15 centavos)
- Conversa média (10 mensagens): ~$0.50-$1.00

**Limpeza (GPT-4o-mini)**:
- 10 produtos: ~5.000 tokens = $0.01 (1 centavo)
- 100 produtos: ~50.000 tokens = $0.05 (5 centavos)
- 500 produtos: ~250.000 tokens = $0.25 (25 centavos)

**Custo mensal típico por usuário ativo**:
- 20 conversas/mês (200 mensagens) = ~$10-20
- 2 uploads/mês (200 produtos cada) = ~$0.10
- **Total: ~$10-20/mês por usuário ativo**

---

## Status

✅ **IMPLEMENTADO e MIGRATION APLICADA**
- Tabela `usage_logs` criada no Supabase
- Claude (chat) instrumentado com 2 pontos de logging
- GPT-4 (limpeza) instrumentado com 1 ponto de logging
- Função `getUserUsageSummary()` para análise de custos
- Build passa sem erros
- Logging é fire-and-forget (não bloqueia fluxo)

**Pronto para teste e push!** 🚀
