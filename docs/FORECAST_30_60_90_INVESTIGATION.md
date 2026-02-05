# Investigação: Previsões 30/60 dias vazias e 90 dias ~0

## Resumo do fluxo

1. **Backend (Python)** gera forecast por produto, escolhe Prophet vs XGBoost por horizonte (`_select_best_forecast`), monta `ForecastResponse` com `product_forecasts[].forecast_30d`, `forecast_60d`, `forecast_90d`.
2. **Next.js** recebe a resposta da API Python, chama `persistForecasts()` (tabela `forecasts`) e **`persistForecastResult()`** (tabela `forecast_results.response` = JSON completo).
3. **Frontend** lê o forecast via **`getForecastFromDb()`** → `forecast_results.response` (não lê a tabela `forecasts` para o gráfico por produto).

Ou seja: o que o usuário vê em 30/60/90 dias vem **só** do JSON em `forecast_results.response`, que é o mesmo retornado pela API Python.

---

## 1. SUPABASE – Como as previsões são armazenadas

### Tabelas envolvidas

| Tabela | Uso |
|--------|-----|
| **`forecasts`** | Uma linha por (product_id, forecast_date): `forecast_date`, `predicted_quantity`, `lower_bound`, `upper_bound`. **Não** diferencia 30d/60d/90d por coluna; o horizonte é implícito pela data. Usada para persistência “flat” pelo Next (`persistForecasts`). |
| **`forecast_results`** | Uma linha por análise: `analysis_id`, **`response` (JSONB)**. Contém o `ForecastResponse` inteiro (incluindo `product_forecasts[].forecast_30d`, `forecast_60d`, `forecast_90d`). **É isso que o frontend usa** para exibir os gráficos. |
| **`forecasts_xgboost`** | Uma linha por (product_id, forecast_date): previsões do XGBoost (3 datas por produto: fim do 1º, 2º e 3º mês). O backend Python lê daqui em `_fetch_xgboost_forecasts()` para montar os arrays 30/60/90. |

### Estrutura relevante

**`forecasts`** (001_initial_schema.sql):

- `product_id`, `forecast_date`, `predicted_quantity`, `lower_bound`, `upper_bound`, `confidence`

**`forecast_results`** (008):

- `analysis_id` (PK), `response` (JSONB), `created_at`

**`forecasts_xgboost`** (010):

- `product_id`, `forecast_date`, `predicted_quantity`, `lower_bound`, `upper_bound`, etc.

Não existe coluna `forecast_horizon` ou `period` nas tabelas; 30/60/90 vêm **só** da estrutura do JSON em `forecast_results.response` e dos 3 pontos em `forecasts_xgboost`.

---

## 2. FRONTEND – Como busca e exibe

### Onde os dados vêm

- **Dashboard / análise:** `getForecastFromDb(supabase, analysisId)` em `lib/services/run-forecast.ts` lê `forecast_results.response` e devolve um `ForecastResponse`.
- Esse objeto é passado para os componentes; **não há query Supabase por horizonte** no frontend; ele só usa o que já está em `response.product_forecasts[]`.

### Componentes que mostram 30/60/90 por produto

- **`ProductDetailDialog`** e **`ForecastDisplay`**: recebem `product.forecast_30d`, `forecast_60d`, `forecast_90d` e repassam para `ForecastChart`.
- **`ForecastChart`** (`components/ForecastChart.tsx`): usa `selectedHorizon` ('30d' | '60d' | '90d') para escolher entre `forecast30d`, `forecast60d`, `forecast90d` e montar a série de previsão.

```ts
// ForecastChart.tsx
const forecastData =
  selectedHorizon === '30d' ? forecast30d
  : selectedHorizon === '60d' ? forecast60d
  : forecast90d
```

Não há filtro por “30” vs “30d”; o frontend espera sempre as listas já separadas por horizonte (`forecast_30d`, `forecast_60d`, `forecast_90d` no JSON).

### Formato esperado

Cada `forecast_30d` / `forecast_60d` / `forecast_90d` é um array de:

- `date` (string ISO), `predicted_quantity`, `lower_bound`, `upper_bound`

Se `forecast_30d` ou `forecast_60d` vier **vazio** `[]`, o gráfico não mostra previsão nesse horizonte. Se `forecast_90d` vier com valores muito baixos, o gráfico mostra “perto de zero”.

---

## 3. BACKEND (Python) – Como monta 30/60/90

### Onde é montado

- **`profeta-forecaster/models/forecaster.py`**:
  - `_forecast_by_product()` (por volta das linhas 644–768) monta, para cada produto:
    - `prophet_30d`, `prophet_60d`, `prophet_90d` via **`_extract_forecast_period(forecast_result, df, days)`**
    - `xgb_30d`, `xgb_60d`, `xgb_90d` via **`_expand_xgboost_to_daily(xgb_raw, last_date, horizon)`**
    - Para cada horizonte, **`_select_best_forecast(prophet_*, xgb_*, ...)`** escolhe Prophet, XGBoost ou ensemble.
  - Os resultados são convertidos em `ForecastDataPoint` e colocados em `ProductForecast(forecast_30d=..., forecast_60d=..., forecast_90d=...)`.

### `_extract_forecast_period` (linhas 880–897)

- Filtra o DataFrame do Prophet: `forecast['ds'] > last_historical_date`, depois `.head(days)`.
- Constrói uma lista de `ForecastDataPoint` com `date`, `predicted_quantity` (yhat), `lower_bound`, `upper_bound`.
- Se esse filtro não retornar linhas (por exemplo, problema de timezone ou de coluna `ds`), o resultado é **lista vazia** → 30d/60d “não mostram nada”.
- Prophet retorna `ds`, `yhat`, `yhat_lower`, `yhat_upper`; o código usa `row['yhat']`, `row['yhat_lower']`, `row['yhat_upper']` (e `max(0, ...)`).

### `_expand_xgboost_to_daily` (linhas 1117–1152)

- Recebe `xgb_raw`: lista de dicts com `date`, `predicted_quantity`, `lower_bound`, `upper_bound` (vinda de **`_fetch_xgboost_forecasts`** em `forecasts_xgboost`).
- Gera `horizon` dias (30, 60 ou 90), distribuindo cada “bucket” de 30 dias (primeiro bucket = primeiros 30 dias, etc.).
- Retorna lista de dicts no formato esperado pelo resto do pipeline. Se `xgb_raw` estiver vazio ou com apenas 1–2 linhas, 60d/90d podem ficar incompletos ou repetir o último bucket.

### `_select_best_forecast` (linhas 1154–1222)

- Se não há XGBoost → usa Prophet.
- Se não há Prophet → usa XGBoost (`_xgboost_to_prophet_format`).
- Caso contrário, usa o Model Router (MAPE, horizonte) para escolher Prophet, XGBoost ou ensemble.
- **Fallback em exceção:** retorna `prophet_forecast`. Se Prophet estiver vazio ou com valores ~0 (ex.: 90d), isso explica “90 dias ~0”.
- O resultado é usado em:
  - `forecast_30d_for_product = to_forecast_data_points(forecast_30d_final) if forecast_30d_final else prophet_30d`
  - Idem para 60d e 90d. Lista vazia `[]` é falsy → usa Prophet; se Prophet também for vazio, o horizonte fica vazio no JSON.

### `_save_forecast` (linhas 1326–1333)

- **Não persiste no Supabase.** Apenas log. A persistência real é feita no Next.js (`persistForecastResult` em `run-forecast.ts`).

---

## 4. Possíveis causas (resumo)

| Hipótese | Onde verificar |
|----------|-----------------|
| **30/60 vazios** | `_extract_forecast_period` retorna `[]`: comparar `forecast['ds']` com `last_historical_date` (timezone, tipo); garantir que Prophet retorna pelo menos 90 linhas futuras. |
| **90d ~0** | Prophet ganha no router para 90d e retorna tendência muito baixa; ou XGBoost não é usado (dados em `forecasts_xgboost` ausentes/errados). |
| **Prophet sobrescreve XGBoost** | Em `_select_best_forecast`, em caso de exceção ou decisão do router, Prophet é usado; se Prophet 90d for ~0, o frontend mostra ~0. |
| **Mismatch de campo** | Backend e frontend usam os mesmos nomes (`forecast_30d`, `forecast_60d`, `forecast_90d`); não há “30” vs “30d” no fluxo atual. |
| **Cache / dado antigo** | Confirmar que, após “Gerar previsão”, o frontend recarrega e lê o novo `forecast_results.response` (ex.: `router.refresh()` em `DashboardAnalysisView`). |

---

## 5. Arquivos relevantes

### Supabase

- `supabase/migrations/001_initial_schema.sql` – tabela `forecasts`
- `supabase/migrations/008_forecast_results.sql` – tabela `forecast_results`
- `supabase/migrations/010_xgboost_tables.sql` – tabela `forecasts_xgboost`

### Frontend

- `lib/services/run-forecast.ts` – `getForecastFromDb`, `persistForecastResult`, `persistForecasts`
- `components/ForecastChart.tsx` – uso de `forecast30d` / `forecast60d` / `forecast90d` e `selectedHorizon`
- `components/dashboard/analysis/ProductDetailDialog.tsx` – passa `product.forecast_30d/60d/90d` para o gráfico
- `components/ForecastDisplay.tsx` – idem
- `types/forecasting.ts` – `ProductForecast`, `ForecastDataPoint`

### Backend Python

- `profeta-forecaster/models/forecaster.py` – `_forecast_by_product`, `_extract_forecast_period`, `_expand_xgboost_to_daily`, `_select_best_forecast`, `_fetch_xgboost_forecasts`
- `profeta-forecaster/schemas/forecast.py` – `ProductForecast`, `ForecastDataPoint`, `ForecastResponse`
- `profeta-forecaster/services/xgboost_service.py` – geração das 3 datas e previsões que viram `forecasts_xgboost`

---

## 6. Próximos passos sugeridos

1. **Inspecionar o JSON em produção**  
   No Supabase, para uma análise que já rodou forecast:
   - Abrir `forecast_results` e ler o campo `response` da análise em questão.
   - Para um `product_forecasts[]`:
     - Ver se `forecast_30d` e `forecast_60d` são `[]` ou têm pontos.
     - Ver se `forecast_90d` tem valores numéricos ou todos ~0.

2. **Logs no backend (por produto e horizonte)**  
   Em `_forecast_by_product`, após obter `prophet_30d`, `prophet_60d`, `prophet_90d` e os `xgb_*d`:
   - Logar `len(prophet_30d)`, `len(prophet_60d)`, `len(prophet_90d)`.
   - Logar `len(xgb_30d)`, `len(xgb_60d)`, `len(xgb_90d)`.
   - Logar um exemplo de `predicted_quantity` (ex.: primeiro/último) para cada horizonte antes de montar `ProductForecast`.  
   Isso mostra se o “vazio” ou “~0” já existe na resposta Python.

3. **Datas e timezone em `_extract_forecast_period`**  
   Garantir que `last_historical_date` e `forecast['ds']` estão no mesmo tipo (ex.: ambos timezone-naive ou ambos UTC). Se um for timezone-aware e outro não, o filtro `forecast['ds'] > last_historical_date` pode retornar vazio e gerar listas vazias para 30/60 (e às vezes 90).

4. **Regra para 90d quando Prophet for ruim**  
   Se os logs mostrarem que para 90d o router escolhe Prophet e os valores são ~0, considerar no backend: para horizonte 90, preferir XGBoost quando Prophet (ou a média de Prophet) for muito menor que XGBoost (ex.: threshold por produto ou global), para evitar “90 dias ~0” no frontend.

Com isso você confirma se o problema está (a) no conteúdo já salvo em `forecast_results.response`, (b) na extração Prophet/XGBoost no Python, ou (c) em timezone/formato de datas em `_extract_forecast_period`.
