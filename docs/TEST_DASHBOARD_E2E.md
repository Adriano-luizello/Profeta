# Teste do Dashboard Model Router (end-to-end)

## Pré-requisitos

- Backend Python rodando: `cd profeta-forecaster && python main.py` (ou `uvicorn main:app --reload`)
- Frontend Next.js rodando: `npm run dev`
- Supabase com análises que tenham produtos e forecasts

---

## 1. Verificar análises no banco

Execute no **Supabase SQL Editor** (ou psql):

```sql
-- Ver análises disponíveis
SELECT
  id,
  created_at,
  (SELECT COUNT(*) FROM products WHERE analysis_id = analyses.id) AS product_count
FROM analyses
ORDER BY created_at DESC
LIMIT 5;
```

Anote um **analysis_id** que tenha `product_count > 0`.

---

## 2. Verificar forecasts (XGBoost e Prophet)

Substitua `SEU_ANALYSIS_ID_AQUI` pelo UUID da análise:

```sql
-- XGBoost
SELECT COUNT(*) AS xgboost_forecasts
FROM forecasts_xgboost fxgb
JOIN products p ON fxgb.product_id = p.id
WHERE p.analysis_id = 'SEU_ANALYSIS_ID_AQUI';

-- Prophet (cache em forecast_results)
SELECT COUNT(*) AS prophet_results
FROM forecast_results
WHERE analysis_id = 'SEU_ANALYSIS_ID_AQUI';

-- model_metadata (XGBoost)
SELECT COUNT(*) AS models
FROM model_metadata
WHERE analysis_id = 'SEU_ANALYSIS_ID_AQUI';
```

Para o dashboard mostrar dados reais, o ideal é:
- `forecast_results` com 1 linha (response com product_forecasts)
- `model_metadata` com N linhas (uma por produto XGBoost)
- `forecasts_xgboost` com previsões por produto

---

## 3. Variável de ambiente (frontend)

No **`.env.local`** na raiz do projeto Next.js:

```env
NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8000
```

(O hook do dashboard usa `NEXT_PUBLIC_PYTHON_API_URL` ou `NEXT_PUBLIC_API_URL`; fallback é `http://localhost:8000`.)

---

## 4. Testar backend com curl

Com o backend rodando:

```bash
# Substitua SEU_ANALYSIS_ID pelo UUID da análise
curl -s "http://localhost:8000/api/dashboard/SEU_ANALYSIS_ID?period=30" | jq
```

Resposta esperada (estrutura):

- `analysis_id`, `time_horizon`, `generated_at`
- `summary`: `total_forecast`, `avg_confidence`, `avg_mape`, `improvement_vs_prophet`, `predominant_model`, etc.
- `actions`: `critical`, `attention`, `opportunity`, `counts`
- `top_best`: array (até 5 produtos)
- `top_worst`: array (até 5 produtos)
- `all_products`: array

Se retornar `"error": "Supabase client not configured"`, configure no **profeta-forecaster** (onde a API roda):

- Crie ou edite `profeta-forecaster/.env` com:
  - `SUPABASE_URL=https://seu-projeto.supabase.co`
  - `SUPABASE_KEY=eyJ...` (anon key ou service role)
- Reinicie o backend para carregar as variáveis.

---

## 5. Testar frontend

1. Abra: **http://localhost:3000/dashboard/SEU_ANALYSIS_ID** (ou 3001 se a 3000 estiver em uso).
2. Verifique:
   - Cards de resumo com números (ações, previsão, MAPE)
   - Tabelas "Top 5 Melhores" e "Top 5 Piores"
   - Dropdown de período (30 / 60 / 90 dias)
   - Ao mudar o período, a página recarrega os dados (loading e nova resposta)

---

## 6. Debug

| Sintoma | O que verificar |
|--------|------------------|
| "Nenhum dado disponível" | analysis_id correto? Produtos e forecasts para essa análise? (queries do passo 2) |
| CORS no browser | Backend `main.py`: `allow_origins` com `http://localhost:3000` e `http://localhost:3001` |
| Loading infinito | `.env.local` com `NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8000`; F12 → Network: a requisição vai para 8000? |
| "Cannot read property X of undefined" | Resposta do backend: `summary`, `actions`, `top_best`, `top_worst` presentes? (curl \| jq) |
| 404 no backend | Rota registrada: `GET /api/dashboard/{analysis_id}`; backend reiniciado após mudanças? |

---

## 7. Se não houver análises com dados

1. Fazer upload de um CSV (ex.: `test-data/sample_sales.csv`) em **Upload de Dados**.
2. Rodar limpeza e depois **Gerar forecast** (Prophet + XGBoost).
3. Usar o **analysis_id** da análise criada na URL do dashboard.

---

## Script de teste rápido (curl)

Na raiz do projeto:

```bash
# Uso: ./scripts/test-dashboard-curl.sh SEU_ANALYSIS_ID
ANALYSIS_ID="${1:-00000000-0000-0000-0000-000000000000}"
echo "Testing GET /api/dashboard/${ANALYSIS_ID}?period=30"
curl -s "http://localhost:8000/api/dashboard/${ANALYSIS_ID}?period=30" | jq 'keys'
```

Se `jq` não estiver instalado: `curl -s "http://localhost:8000/api/dashboard/$ANALYSIS_ID?period=30"` e conferir o JSON manualmente.
