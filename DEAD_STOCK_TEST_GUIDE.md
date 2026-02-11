# 🧪 Guia de Teste — Estoque Parado + Stop Loss (P2 #8)

**Data:** 2026-02-11  
**Status:** ✅ Implementado, aguardando testes

---

## 🎯 O que foi implementado

**Nova tool:** `get_dead_stock_analysis`

**Features:**
- Identifica produtos sem vendas ou com vendas baixas (últimos 90 dias)
- Classifica produtos: ⚫ Parado | 🟠 Lento | 🟢 Saudável
- Calcula capital preso em estoque (stock × price)
- Estima custo de oportunidade mensal (2% do capital)
- Cruza com forecast (tendência: crescente, declinante, estável, zero)
- Gera recomendações acionáveis:
  - ⛔ Descontinuar
  - 🏷️ Considerar desconto
  - 👀 Monitorar
  - ✅ Produto saudável

**3 views disponíveis:**
1. `all` (default): Lista detalhada de produtos problemáticos
2. `dead`: Apenas produtos com zero vendas
3. `summary`: Resumo executivo com totais

---

## 🧪 Como Testar

### Pré-requisitos
- ✅ Servidor rodando: `http://localhost:3006/dashboard`
- ✅ Dados no banco: sales_history, products, forecasts
- ✅ Chat aberto no dashboard

### Testes Obrigatórios

#### Teste 1: Lista completa de produtos problemáticos
**Pergunta:**
```
Quais produtos estão parados?
```
ou
```
Tenho estoque parado?
```

**Esperado:**
- Tabela com colunas: Status | Produto | Categoria | Vendas 90d | Última Venda | Capital Preso | Custo Mensal | Tendência | Recomendação
- Produtos ordenados: ⚫ Parado primeiro, depois 🟠 Lento
- Valores em R$ formatados
- Recomendações específicas por produto

**Se não houver produtos parados:**
- Mensagem: "✅ Nenhum produto parado. Todos os produtos tiveram vendas nos últimos 90 dias."

---

#### Teste 2: Apenas produtos completamente parados
**Pergunta:**
```
Produtos sem nenhuma venda nos últimos 90 dias
```
ou
```
Lista de produtos dead stock
```

**Esperado:**
- Apenas produtos com status ⚫ Parado
- Mesma estrutura de tabela do Teste 1

---

#### Teste 3: Resumo executivo
**Pergunta:**
```
Resumo do estoque parado
```
ou
```
Quanto dinheiro está preso em estoque parado?
```

**Esperado:**
- Tabela com métricas agregadas:
  - Qtd produtos parados
  - Qtd produtos lentos
  - Capital preso (parados)
  - Capital preso (lentos)
  - Custo de oportunidade mensal
  - Contadores de recomendações

**Exemplo:**
| Métrica | Valor |
|---------|-------|
| Produtos parados (0 vendas em 90d) | 5 produtos |
| Produtos lentos | 12 produtos |
| Capital total preso (parados) | R$ 45.000,00 |
| Capital total preso (lentos) | R$ 23.500,00 |
| Custo de oportunidade mensal | ~R$ 1.370,00/mês |
| Recomendação: descontinuar | 3 produtos |
| Recomendação: desconto | 10 produtos |
| Recomendação: monitorar | 4 produtos |

---

#### Teste 4: Perguntas variadas (teste de NLP)
Claude deve invocar a tool automaticamente para:

```
Onde estou perdendo dinheiro com estoque?
```
```
Produtos para descontinuar
```
```
Quais produtos devo tirar do catálogo?
```
```
Capital preso em estoque
```
```
Produtos lentos (slow movers)
```
```
Stop loss - quais produtos cortar?
```

---

## ✅ Validações Importantes

### Dados
- [ ] Produtos com `current_stock` null mostram "—" em Capital Preso
- [ ] Produtos com `price` null mostram "—" em Capital Preso
- [ ] Produtos sem forecast mostram "—" em Tendência
- [ ] "Última Venda" mostra "Há X dias" ou "Sem vendas"

### Classificação
- [ ] ⚫ Parado: 0 vendas nos últimos 90 dias
- [ ] 🟠 Lento: < 0.1 un/dia OU > 30 dias desde última venda
- [ ] 🟢 Saudável: vendas regulares (não aparece na lista `all`)

### Recomendações
- [ ] "⛔ Descontinuar": produto parado + forecast zero/declinante
- [ ] "🏷️ Considerar desconto": produto lento + capital preso > 0
- [ ] "👀 Monitorar": produto parado + forecast crescente
- [ ] "✅ Produto saudável": vendas regulares

### Cálculos
- [ ] Capital preso = current_stock × price
- [ ] Custo mensal = capital preso × 2% (0.02)
- [ ] Média de vendas = total_quantity_90d / 90

### Tendência de Forecast
- [ ] 📈 Crescente: forecast > vendas_90d × 1.1
- [ ] 📉 Declinante: forecast < vendas_90d × 0.5
- [ ] ➡️ Estável: forecast ≈ vendas_90d
- [ ] ⏸️ Zero: forecast < 1

---

## 🐛 Troubleshooting

### Tool não é invocada
- **Causa:** Tool não registrada ou servidor não reiniciado
- **Fix:** Restart do dev server

### Erro: "Sem dados de produtos"
- **Causa:** Não há análise completa ou não há produtos
- **Fix:** Fazer upload de CSV com produtos

### Valores zerados ou null
- **Causa:** `current_stock` ou `price` não estão preenchidos
- **Fix:** Normal - tabela mostra "—" para esses casos

### Tabela vazia apesar de ter produtos
- **Causa:** Todos os produtos são "healthy" (vendas regulares)
- **Fix:** Normal - mensagem: "✅ Nenhum produto parado"

### Recomendações não fazem sentido
- **Causa:** Lógica de classificação precisa ajuste
- **Debug:** Verificar console do servidor para logs

---

## 📊 Queries de Debug (opcional)

Execute no Supabase SQL Editor para validar dados:

```sql
-- 1. Produtos sem vendas nos últimos 90 dias
SELECT 
  p.id,
  p.cleaned_name,
  p.current_stock,
  p.price,
  COUNT(sh.id) as vendas_90d
FROM products p
LEFT JOIN sales_history sh ON sh.product_id = p.id 
  AND sh.date >= CURRENT_DATE - INTERVAL '90 days'
WHERE p.analysis_id IN (
  SELECT id FROM analyses 
  WHERE status = 'completed' 
  ORDER BY created_at DESC 
  LIMIT 1
)
GROUP BY p.id
HAVING COUNT(sh.id) = 0
ORDER BY (p.current_stock * p.price) DESC NULLS LAST;

-- 2. Capital preso por status
WITH product_sales AS (
  SELECT 
    p.id,
    p.cleaned_name,
    p.current_stock,
    p.price,
    COUNT(sh.id) as vendas,
    MAX(sh.date) as ultima_venda
  FROM products p
  LEFT JOIN sales_history sh ON sh.product_id = p.id 
    AND sh.date >= CURRENT_DATE - INTERVAL '90 days'
  WHERE p.analysis_id IN (
    SELECT id FROM analyses 
    WHERE status = 'completed' 
    ORDER BY created_at DESC 
    LIMIT 1
  )
  GROUP BY p.id
)
SELECT 
  CASE 
    WHEN vendas = 0 THEN 'Parado'
    WHEN vendas < 9 OR ultima_venda < CURRENT_DATE - INTERVAL '30 days' THEN 'Lento'
    ELSE 'Saudável'
  END as status,
  COUNT(*) as qtd_produtos,
  SUM(current_stock * price) as capital_preso
FROM product_sales
GROUP BY status
ORDER BY status;
```

---

## 📝 Checklist Final

Antes de dar push:

- [ ] Tool é invocada automaticamente pelo Claude
- [ ] Tabela renderiza corretamente no chat
- [ ] Valores em R$ formatados
- [ ] Status (⚫🟠🟢) aparecem corretamente
- [ ] Tendências (📈📉➡️⏸️) aparecem
- [ ] Recomendações são específicas e acionáveis
- [ ] View "summary" mostra totais corretos
- [ ] View "dead" filtra corretamente
- [ ] Mensagem amigável quando não há produtos parados
- [ ] Não há erros no console

---

**Status:** Pronto para testar! 🚀
