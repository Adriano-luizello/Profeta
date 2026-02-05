# Investigação: Código completo 30d / 60d / 90d por produto

Documento apenas de investigação (sem correções). Logs de valores finais foram adicionados no backend.

---

## 1. `_expand_xgboost_to_daily` (linhas ~1185–1219)

**O que faz:** Converte os N pontos **mensais** do XGBoost (ex.: 3 buckets: jan, fev, mar) em pontos **diários** para um horizonte de `horizon` dias.

**Lógica:**
- `xgb_raw`: lista de dicts com `predicted_quantity`, `lower_bound`, `upper_bound` (e `date`). Cada ponto = demanda **total do mês** (30 dias).
- `days_per_bucket = 30`: cada bucket cobre 30 dias.
- Para cada dia `i` em `range(horizon)`:
  - `bucket_idx = min(i // 30, len(xgb_raw) - 1)`  
    - Dias 0–29 → bucket 0 (1º mês)  
    - Dias 30–59 → bucket 1 (2º mês)  
    - Dias 60–89 → bucket 2 (3º mês)
  - `daily_pred = pred / 30` (distribui o total mensal em 30 dias).
- Gera exatamente `horizon` pontos diários (30, 60 ou 90 conforme a chamada).

**Resposta à pergunta 2:**  
Para **60d**, `_expand_xgboost_to_daily(xgb_raw, last_date, 60)` gera **60 dias**: dias 0–29 usam bucket 0, dias 30–59 usam bucket 1. **O bucket de março (3º) não entra em 60d.** Não há interpolação; usa só os primeiros 2 buckets. Para **90d** entram os 3 buckets. Ou seja: 30d = 1 bucket, 60d = 2 buckets, 90d = 3 buckets.

```python
def _expand_xgboost_to_daily(
    self,
    xgb_raw: List[Dict],
    last_historical_date: pd.Timestamp,
    horizon: int,
) -> List[Dict]:
    if not xgb_raw or horizon <= 0:
        return []

    days_per_bucket = 30
    result = []
    start = pd.Timestamp(last_historical_date) + timedelta(days=1)

    for i in range(horizon):
        bucket_idx = min(i // days_per_bucket, len(xgb_raw) - 1)
        point = xgb_raw[bucket_idx]
        pred = point["predicted_quantity"]
        lb = point.get("lower_bound", pred * 0.8)
        ub = point.get("upper_bound", pred * 1.2)
        daily_pred = pred / days_per_bucket
        daily_lb = lb / days_per_bucket
        daily_ub = ub / days_per_bucket
        d = start + timedelta(days=i)
        result.append({
            "date": d.strftime("%Y-%m-%d"),
            "predicted_quantity": daily_pred,
            "lower_bound": daily_lb,
            "upper_bound": daily_ub,
        })

    return result
```

---

## 2. `_aggregate_daily_to_monthly` (linhas ~1332–1373)

**O que faz:** Reagrupa uma lista de pontos **diários** em pontos **mensais** (soma por mês).

**Lógica:**
- Agrupa por `date_str[:7]` (YYYY-MM).
- Para cada mês: soma `predicted_quantity`, `lower_bound`, `upper_bound`.
- Retorna um ponto por mês com `date` = último dia do mês (ex.: 2026-01-31).

**Implicação:** Se 60d tem 60 dias (jan + fev), após agregar vira **2 pontos** (jan, fev). Se 90d tem 90 dias (jan + fev + mar), vira **3 pontos**. O valor de **março** só existe em 90d; em 60d não há março. Por isso “o valor de março deveria ser o mesmo em 60d e 90d” **não se aplica** ao desenho atual: em 60d não há terceiro mês.

```python
def _aggregate_daily_to_monthly(self, daily_forecast: List[Dict]) -> List[Dict]:
    if not daily_forecast:
        return daily_forecast

    monthly = defaultdict(
        lambda: {"sum": 0.0, "count": 0, "lower_sum": 0.0, "upper_sum": 0.0}
    )
    for point in daily_forecast:
        date_str = point.get("date", "")[:10]
        if len(date_str) < 7:
            continue
        month_key = date_str[:7]
        pred = point.get("predicted_quantity", 0)
        lb = point.get("lower_bound", pred * 0.8)
        ub = point.get("upper_bound", pred * 1.2)
        monthly[month_key]["sum"] += pred
        monthly[month_key]["count"] += 1
        monthly[month_key]["lower_sum"] += lb
        monthly[month_key]["upper_sum"] += ub

    result = []
    for month_key in sorted(monthly.keys()):
        m = monthly[month_key]
        if m["count"] == 0:
            continue
        year, month = int(month_key[:4]), int(month_key[5:7])
        last_day = monthrange(year, month)[1]
        date_str = f"{month_key}-{last_day:02d}"
        result.append({
            "date": date_str,
            "predicted_quantity": m["sum"],
            "lower_bound": m["lower_sum"],
            "upper_bound": m["upper_sum"],
        })
    return result
```

---

## 3. Trecho de `_forecast_by_product` (montagem dos finais)

**Fluxo resumido:**
1. `prophet_30d/60d/90d` = `_extract_forecast_period` (Prophet, diário).
2. `xgb_30d/60d/90d` = `_expand_xgboost_to_daily(xgb_raw, last_date, 30|60|90)`.
3. `forecast_30d_final` = `_select_best_forecast(prophet_30d, xgb_30d, ...)` (e idem 60d, 90d).
4. `_validate_forecast_values` para cada horizonte (substitui por XGBoost se forecast ~0).
5. Se `_is_historical_monthly(df)`: aplica `_aggregate_daily_to_monthly` em cada `forecast_*d_final`.
6. `forecast_*d_for_product` = `to_forecast_data_points(forecast_*d_final)` ou fallback Prophet.

**Trecho relevante (montagem dos finais + agregação):**

```python
xgb_30d = self._expand_xgboost_to_daily(xgb_raw, last_date, 30) if xgb_raw else []
xgb_60d = self._expand_xgboost_to_daily(xgb_raw, last_date, 60) if xgb_raw else []
xgb_90d = self._expand_xgboost_to_daily(xgb_raw, last_date, 90) if xgb_raw else []

forecast_30d_final = self._select_best_forecast(
    prophet_forecast=to_dict_list(prophet_30d),
    xgboost_forecast=xgb_30d,
    prophet_mape=prophet_mape,
    xgboost_mape=xgb_mape,
    horizon=30,
    product_name=product_name,
)
# idem para 60d e 90d...

forecast_30d_final = self._validate_forecast_values(
    forecast_30d_final, xgb_30d, product_name, 30, historical_mean
)
# idem 60d, 90d...

if self._is_historical_monthly(df):
    forecast_30d_final = self._aggregate_daily_to_monthly(forecast_30d_final)
    forecast_60d_final = self._aggregate_daily_to_monthly(forecast_60d_final)
    forecast_90d_final = self._aggregate_daily_to_monthly(forecast_90d_final)

forecast_30d_for_product = (
    to_forecast_data_points(forecast_30d_final) if forecast_30d_final else prophet_30d
)
# idem 60d, 90d...
```

---

## 4. `_select_best_forecast` (linhas ~1221–1276)

**O que faz:** Escolhe entre Prophet, XGBoost ou Ensemble por horizonte (30, 60 ou 90).

**Lógica:**
- Sem XGBoost → retorna Prophet.
- Sem Prophet → retorna XGBoost (formatado).
- Caso contrário chama `model_router.select_model(..., time_horizon=th, ...)` com `th = 30 if horizon <= 45 else (60 if horizon <= 75 else 90)`.
- Conforme `selection.model`: retorna `_xgboost_to_prophet_format(xgboost_forecast)`, `prophet_forecast`, ou `_calculate_ensemble(prophet_forecast, xgboost_forecast, weights)`.
- Em exceção: fallback para XGBoost se tiver valores > 0, senão Prophet.

**Resposta à pergunta 3:** Sim: o modelo pode ser **diferente por horizonte** (30d XGBoost, 60d Ensemble, 90d Prophet, etc.). Se para 60d o router escolher Ensemble e o Prophet no 2º mês for ~0, o ensemble (média ponderada) puxa o valor para baixo.

---

## 5. `_calculate_ensemble` (linhas ~1390–1428)

**O que faz:** Média ponderada **ponto a ponto** entre Prophet e XGBoost.

**Fórmula:** Para cada índice `i` (até `min(len(prophet), len(xgboost))`):

- `ensemble_pred = prophet_point["predicted_quantity"] * prophet_weight + xgboost_point["predicted_quantity"] * xgboost_weight`
- `lower_bound` e `upper_bound`: mesma combinação ponderada dos bounds de cada modelo.

**Resposta à pergunta 4:** Se XGBoost 60d (2 meses) = [1700, 1200] e Prophet 60d = [1700, 0], com pesos 0.5/0.5 o ensemble dá [1700, 600]. Ou seja: **um Prophet ~0 no 2º mês reduz o valor do 2º mês no ensemble**, o que pode explicar “60d despenca para ~0” se o Prophet estiver muito baixo e o peso do Prophet for relevante.

```python
def _calculate_ensemble(
    self,
    prophet_forecast: List[Dict],
    xgboost_forecast: List[Dict],
    weights: Dict[str, float],
) -> List[Dict]:
    prophet_weight = weights.get("prophet", 0.5)
    xgboost_weight = weights.get("xgboost", 0.5)
    total = prophet_weight + xgboost_weight
    prophet_weight /= total
    xgboost_weight /= total

    result = []
    min_len = min(len(prophet_forecast), len(xgboost_forecast))

    for i in range(min_len):
        prophet_point = prophet_forecast[i]
        xgboost_point = xgboost_forecast[i]
        ensemble_pred = (
            prophet_point["predicted_quantity"] * prophet_weight
            + xgboost_point["predicted_quantity"] * xgboost_weight
        )
        result.append({
            "date": prophet_point["date"],
            "predicted_quantity": ensemble_pred,
            "lower_bound": prophet_point.get("lower_bound", ensemble_pred * 0.8) * prophet_weight
                + xgboost_point.get("lower_bound", ensemble_pred * 0.8) * xgboost_weight,
            "upper_bound": prophet_point.get("upper_bound", ensemble_pred * 1.2) * prophet_weight
                + xgboost_point.get("upper_bound", ensemble_pred * 1.2) * xgboost_weight,
        })

    return result
```

---

## 6. Logs adicionados

Antes de `forecasts.append(ProductForecast(...))` foram adicionados:

```python
logger.info(
    f"  [{product_name}] FINAL forecast_30d: {[round(f.predicted_quantity, 2) for f in forecast_30d_for_product]}"
)
logger.info(
    f"  [{product_name}] FINAL forecast_60d: {[round(f.predicted_quantity, 2) for f in forecast_60d_for_product]}"
)
logger.info(
    f"  [{product_name}] FINAL forecast_90d: {[round(f.predicted_quantity, 2) for f in forecast_90d_for_product]}"
)
```

Assim, nos logs do backend (incluindo para “Kissen-Inlett Sia” ou qualquer produto) você verá os valores **finais** por horizonte (já após Model Router, validação e agregação mensal), o que permite checar:
- se 60d tem 2 valores (jan, fev) e 90d tem 3 (jan, fev, mar);
- se o 2º mês em 60d está coerente com o 2º mês em 90d;
- se algum horizonte está caindo para ~0 por causa de Prophet/Ensemble.

---

## Resumo das verificações

| Pergunta | Resposta |
|----------|----------|
| 60d usa 2 ou 3 buckets do XGBoost? | **2 buckets** (dias 0–29 e 30–59). Março não entra em 60d. |
| Valor de março em 60d vs 90d? | Em 60d **não existe** março; só em 90d. Por isso não podem “ser iguais” no desenho atual. |
| Modelo pode ser diferente por horizonte? | **Sim.** Router escolhe por horizonte (30/60/90); 60d pode ser Ensemble enquanto 30d é XGBoost. |
| Ensemble pode puxar para ~0? | **Sim.** Se Prophet no 2º mês for ~0, ensemble = 0.5*XGBoost + 0.5*0 → metade do XGBoost; se Prophet for 0 em mais pontos, a “queda” fica mais forte. |
| Onde ver os valores finais? | Logs `FINAL forecast_30d/60d/90d` no backend (um por produto). |

Nenhuma correção foi aplicada; apenas investigação e logs.
