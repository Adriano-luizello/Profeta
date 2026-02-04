# Mapeamento do Endpoint de Forecast (para integração Model Router)

**Data:** 2026-02-04  
**Objetivo:** Documentar a estrutura atual para integrar Model Router sem quebrar o dashboard.

---

## 1. Onde está o endpoint de forecast?

### Cadeia completa (Next.js → Python)

| Camada | Arquivo | Endpoint | Função |
|--------|---------|----------|--------|
| **Next.js (API)** | `app/api/analyses/[id]/forecast/route.ts` | `POST /api/analyses/{id}/forecast` | Recebe request, valida auth, chama `runForecast()` |
| **Next.js (service)** | `lib/services/run-forecast.ts` | - | `runForecast()` → chama Python + persiste em Supabase |
| **Next.js (client)** | `lib/services/forecast-client.ts` | - | `forecastClient.generateForecast()` → `POST {PYTHON_API}/forecast` |
| **Python (FastAPI)** | `profeta-forecaster/main.py` | `POST /forecast` | `generate_forecast()` → chama `forecaster.generate_forecast()` |
| **Python (modelo)** | `profeta-forecaster/models/forecaster.py` | - | `ProphetForecaster.generate_forecast()` → lógica principal |

**Importante:** O endpoint Python é `POST /forecast` (não `/analyses/{id}/forecast`). O `analysis_id` vem no body da requisição.

---

## 2. Estrutura da função `generate_forecast` (Python)

**Arquivo:** `profeta-forecaster/models/forecaster.py`  
**Classe:** `ProphetForecaster`  
**Método:** `async def generate_forecast(analysis_id, forecast_days, by_product, by_category)`

### Fluxo atual

1. **Busca produtos**
   - `_fetch_products(analysis_id)` → `supabase.table("products").select("*").eq("analysis_id", analysis_id)`

2. **Busca histórico de vendas**
   - `_fetch_sales_history(product_ids)` → tabela `sales_history`
   - Se vazio ou sintético → `_generate_synthetic_data()`

3. **Feature engineering** (se dados reais)
   - `feature_engineer.run()` → salva em `feature_store`

4. **XGBoost** (se dados reais, `by_product=True`)
   - Loop por produto: treina XGBoost, gera forecast
   - Salva em `forecasts_xgboost` (upsert)
   - Salva em `model_metadata` (upsert)

5. **Prophet por produto** (`by_product=True`)
   - `_forecast_by_product()` → Prophet por produto, retorna `forecast_30d`, `forecast_60d`, `forecast_90d`, `metrics`, `recommendations`

6. **Prophet por categoria** (`by_category=True`)
   - `_forecast_by_category()` → Prophet agregado por categoria

7. **Monta resposta**
   - `ForecastResponse(product_forecasts, category_forecasts, stats)`

8. **Salva no banco**
   - `_save_forecast(response)` → **atualmente só log** (TODO no Python). O salvamento real é no Next.js.

### Resposta retornada (ForecastResponse)

```python
{
  "analysis_id": "uuid",
  "created_at": "ISO string",
  "product_forecasts": [
    {
      "product_id": "uuid",
      "product_name": "...",
      "category": "...",
      "historical_data": [{"date": "...", "quantity": N}],
      "forecast_30d": [{"date": "...", "predicted_quantity": N, "lower_bound": N, "upper_bound": N}],
      "forecast_60d": [...],
      "forecast_90d": [...],
      "metrics": {"mape": N, "rmse": N, "mae": N, "trend": "...", "seasonality_strength": N},
      "recommendations": {"restock_date": null, "suggested_quantity": N, "confidence": N, "reasoning": "..."}
    }
  ],
  "category_forecasts": [...],
  "stats": {"total_products": N, "categories": N, "forecast_horizons": [30,60,90], "generated_at": "..."}
}
```

---

## 3. XGBoost já está integrado?

**Sim.** XGBoost **já roda** dentro de `ProphetForecaster.generate_forecast()`:

| Item | Status | Local |
|------|--------|-------|
| **Treina XGBoost** | ✅ | `models/forecaster.py` linhas 246–325 |
| **Salva em forecasts_xgboost** | ✅ | `self.supabase.table("forecasts_xgboost").upsert(...)` |
| **Salva em model_metadata** | ✅ | `self.supabase.table("model_metadata").upsert(...)` |
| **Serviço dedicado** | ✅ | `services/xgboost_service.py` (`XGBoostForecaster`) |

**Condições para rodar XGBoost:**
- `use_synthetic == False` (dados reais de vendas)
- `sales_df` não vazio
- `by_product == True`
- Produto tem ≥ 6 linhas em `feature_store`

**Problema atual:** O output final que vai para o dashboard é **só Prophet**. O XGBoost salva em `forecasts_xgboost` e `model_metadata`, mas a resposta `ForecastResponse` é construída apenas com `_forecast_by_product()` e `_forecast_by_category()` (Prophet). O Model Router no dashboard lê XGBoost + Prophet do banco, mas o endpoint de **geração** não usa o Model Router — sempre retorna Prophet.

---

## 4. Como os dados são salvos em forecast_results?

O Python **não** salva em `forecast_results`. Quem persiste é o **Next.js** em `lib/services/run-forecast.ts`:

```typescript
// runForecast() após receber response do Python:
await persistForecasts(supabase, response)      // → tabela 'forecasts'
await persistRecommendations(supabase, response) // → tabela 'recommendations'
await persistForecastResult(supabase, analysisId, response) // → tabela 'forecast_results'
```

**`persistForecastResult`** (linhas 137–152):
- Tabela: `forecast_results`
- Upsert: `{ analysis_id, response: <ForecastResponse completo>, created_at }`
- `onConflict: 'analysis_id'`

O `response` é o JSON completo retornado pelo Python (product_forecasts, category_forecasts, stats).

---

## 5. Resumo para integração Model Router

| Pergunta | Resposta |
|----------|----------|
| **Arquivo do endpoint Python** | `profeta-forecaster/main.py` (POST /forecast) |
| **Lógica de geração** | `profeta-forecaster/models/forecaster.py` → `ProphetForecaster.generate_forecast()` |
| **XGBoost já roda?** | ✅ Sim, dentro do mesmo `generate_forecast()`, salva em forecasts_xgboost e model_metadata |
| **Resposta final hoje** | Só Prophet (product_forecasts, category_forecasts) |
| **Quem salva forecast_results** | Next.js `run-forecast.ts` → `persistForecastResult()` |
| **Estrutura esperada pelo dashboard** | `ForecastResponse` com `product_forecasts[].forecast_30d|60d|90d`, `metrics`, `recommendations` |

**Integração Model Router (implementada em 2026-02-04):**  
O `ProphetForecaster._forecast_by_product()` agora usa `model_router.select_model()` por horizonte. Após Prophet e XGBoost rodarem, o Model Router escolhe o melhor modelo (XGBoost, Prophet ou Ensemble) para cada horizonte (30/60/90 dias) e monta `forecast_30d`, `forecast_60d`, `forecast_90d` no mesmo formato que o dashboard espera. Fallback para Prophet em caso de erro ou ausência de dados XGBoost.
