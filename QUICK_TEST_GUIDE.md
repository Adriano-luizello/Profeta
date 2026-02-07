# 🧪 Guia Rápido de Teste - Supply Chain Intelligence

## ⏱️ Teste em 10 Minutos

### 1️⃣ Migration (2 min)
```bash
# Copiar conteúdo do arquivo
cat supabase/migrations/017_supply_chain_fields.sql

# No Supabase Dashboard:
# 1. Ir em SQL Editor
# 2. Colar o conteúdo
# 3. Clicar em "Run"
```

✅ **Validar:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name IN ('avg_daily_demand', 'safety_stock_days');
```

Deve retornar 2 linhas.

---

### 2️⃣ Python - Testar Cálculo (3 min)

**Opção A: Via API (recomendado)**
```bash
cd profeta-forecaster

# Certificar que está rodando
# (ou rodar: uvicorn main:app --reload)

# Em outro terminal:
curl -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "analysis_id": "SEU_ANALYSIS_ID_AQUI",
    "forecast_days": [30, 60, 90],
    "by_product": true,
    "by_category": false
  }'
```

**Opção B: Via script**
```python
# test_avg_daily_demand.py
from models.forecaster import ProphetForecaster
import os

forecaster = ProphetForecaster(
    supabase_url=os.getenv("SUPABASE_URL"),
    supabase_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# Usar um analysis_id real do seu banco
result = await forecaster.generate_forecast(
    analysis_id="SEU_ANALYSIS_ID_AQUI",
    forecast_days=[30, 60, 90],
    by_product=True,
    by_category=False
)

print("Forecast gerado!")
```

✅ **Validar logs:**
```
📊 Calculando avg_daily_demand por produto...
  [Nome do Produto]: avg_daily_demand = X.XXXX un/dia
💾 Persistindo avg_daily_demand para N produtos...
✅ avg_daily_demand persistido: N produtos
```

✅ **Validar no banco:**
```sql
SELECT 
  COALESCE(cleaned_name, original_name) as nome,
  current_stock,
  avg_daily_demand,
  safety_stock_days
FROM products
WHERE avg_daily_demand IS NOT NULL
LIMIT 5;
```

Deve retornar produtos com `avg_daily_demand` preenchido.

---

### 3️⃣ TypeScript - Dashboard (3 min)
```bash
npm run dev
```

Acessar: http://localhost:3000/dashboard

✅ **Validar:**
- [ ] Dashboard carrega sem erros
- [ ] KPI "Produtos em Risco" mostra número
- [ ] Seção "Alertas de Reordenamento" aparece (se houver produtos em risco)
- [ ] Seção "Supply Chain Intelligence" aparece
- [ ] Produtos mostram fornecedor, lead time, MOQ

**Abrir DevTools (F12):**
- [ ] Sem erros no console
- [ ] Network tab: requests para `/api/...` com status 200

---

### 4️⃣ Chat Assistant (2 min)

No chat (canto inferior direito):

```
Quais produtos estão em risco?
```

✅ **Validar resposta:**
- [ ] Aparece tabela (não texto simples)
- [ ] Colunas incluem: produto, estoque_atual, dias_ate_ruptura, urgencia, reorder_point
- [ ] Urgência tem emoji (🔴🟡🔵🟢)
- [ ] Se houver alerta de MOQ, aparece na coluna `moq_alerta`

**Teste filtro:**
```
Mostre apenas produtos críticos
```

✅ **Validar:**
- [ ] Apenas produtos com 🔴 Critical aparecem

---

## ⚡ Teste Rápido de Cálculos

### Cenário de Teste Manual

Criar produto de teste:
```sql
-- 1. Criar produto
INSERT INTO products (
  id, 
  analysis_id, 
  original_name, 
  current_stock, 
  avg_daily_demand, 
  safety_stock_days
) VALUES (
  gen_random_uuid(),
  'SEU_ANALYSIS_ID',
  'Teste ROP',
  50,          -- 50 unidades em estoque
  5.0,         -- 5 unidades por dia
  7            -- 7 dias de safety stock
);

-- 2. Vincular a fornecedor com lead time = 15 dias
UPDATE products 
SET supplier_id = 'SEU_SUPPLIER_ID'
WHERE original_name = 'Teste ROP';
```

**Cálculos esperados:**
```
avg_daily_demand = 5.0 un/dia
safety_stock_days = 7
safety_stock_units = 5.0 × 7 = 35 un

lead_time_days = 15
reorder_point = (5.0 × 15) + 35 = 110 un

current_stock = 50 un
days_until_stockout = 50 / 5.0 = 10 dias

Urgência:
- days_until_stockout (10) < lead_time (15)
- Logo: 🔴 CRITICAL
- Motivo: "Ruptura inevitável: mesmo pedindo hoje, ficará 5 dias sem estoque"
```

✅ **Validar no dashboard:**
- [ ] Produto "Teste ROP" aparece como 🔴 Critical
- [ ] Reorder Point = 110
- [ ] Dias até ruptura = 10
- [ ] Motivo correto sobre ruptura

---

## 🐛 Debug se Algo Falhar

### Python não calcula avg_daily_demand

**Sintoma:** Logs não mostram "📊 Calculando avg_daily_demand"

**Verificar:**
```python
# No forecaster.py, linha ~449, deve ter:
if response.product_forecasts:
    logger.info("📊 Calculando avg_daily_demand por produto...")
    self._calculate_and_persist_avg_daily_demand(response.product_forecasts, sales_df)
```

**Solução:** Verificar que a função foi adicionada e chamada corretamente.

---

### TypeScript não mostra métricas novas

**Sintoma:** Dashboard não mostra ROP, dias até ruptura

**Verificar console (F12):**
```
[supply-chain] getSupplyChainMetrics: ...
```

**Se aparecer erro:**
- Verificar que migration 017 foi aplicada
- Verificar que `lib/supply-chain.ts` foi criado
- Verificar imports em `dashboard-data.ts`

**Solução rápida:**
```bash
# Rebuild do Next.js
rm -rf .next
npm run dev
```

---

### Chat não retorna tabela expandida

**Sintoma:** Chat retorna tabela com poucas colunas

**Verificar:**
```typescript
// Em lib/analytics/chart-data-generator.ts
// Função supplyChainTable deve usar:
const metrics = await getSupplyChainMetrics(supabase, userId)
```

**Se estiver usando:**
```typescript
const kpis = await getDashboardKpis(supabase, userId)
```

Isso indica que o arquivo não foi atualizado.

---

## ✅ Critérios de Sucesso

Implementação está **100% funcional** se:

1. ✅ Migration aplicada → 2 colunas novas em `products`
2. ✅ Python persiste → `avg_daily_demand` no banco após forecast
3. ✅ Dashboard mostra → Produtos em risco com métricas corretas
4. ✅ Chat retorna → Tabela com 11 colunas incluindo ROP e urgência
5. ✅ Cálculos corretos → ROP = (demanda × lead_time) + safety_stock
6. ✅ Urgência faz sentido → Critical quando days < lead_time
7. ✅ MOQ alerts aparecem → Quando MOQ > necessidade
8. ✅ Sem erros → Console limpo, sem crashes

---

## 📞 Troubleshooting Rápido

| Problema | Causa Provável | Solução |
|----------|---------------|---------|
| avg_daily_demand sempre NULL | Python não foi atualizado | Verificar forecaster.py linha ~449 e ~1115 |
| avg_daily_demand muito alto | Forecast mensal tratado como diário | Ajustar threshold `is_monthly` |
| avg_daily_demand muito baixo | Forecast diário tratado como mensal | Ajustar threshold `is_monthly` |
| Todos critical | Lead time muito alto | Reduzir lead_time_days dos fornecedores |
| Nenhum critical | Lead time muito baixo | Aumentar lead_time_days ou reduzir estoque |
| MOQ alert sempre | MOQ defaults muito altos | Ajustar MOQ dos fornecedores |
| Dashboard vazio | Análise não tem products | Fazer upload de CSV primeiro |
| Chat não responde | Tool não atualizada | Verificar tool-definitions.ts |
| Erro de tipo | Import faltando | Verificar imports nos arquivos modificados |

---

**Tempo estimado total: 10-15 minutos** ⏱️

Se todos os testes passarem → **Implementação COMPLETA! 🎉**
