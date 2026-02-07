# Investigação: Vendas Totais 30d correto (~8–10k), 60d/90d errado (100k–150k)

Documento de investigação apenas. Sem correções.

---

## 1. FRONTEND – `getAggregatedChartData` (lib/analysis-helpers.ts)

### Código completo da função

Arquivo: `lib/analysis-helpers.ts`. A função **não recebe horizonte**. Ela sempre retorna **as três séries** (30d, 60d, 90d) a partir do mesmo `forecast`:

```typescript
export function getAggregatedChartData(forecast: ForecastResponse): {
  historical: HistoricalDataPoint[]
  forecast30d: ForecastDataPoint[]
  forecast60d: ForecastDataPoint[]
  forecast90d: ForecastDataPoint[]
} {
  if (!forecast.product_forecasts?.length) {
    return { historical: [], forecast30d: [], forecast60d: [], forecast90d: [] }
  }

  const allHistorical: { date: string; quantity: number }[] = []
  for (const pf of forecast.product_forecasts) {
    for (const h of pf.historical_data ?? []) {
      allHistorical.push({ date: h.date, quantity: h.quantity })
    }
  }
  const historicalAgg = sumByDate(allHistorical, (x) => x.quantity)
  const historical: HistoricalDataPoint[] = historicalAgg.map((x) => ({
    date: x.date,
    quantity: x.quantity,
  }))

  const raw30 = sumByDate(
    forecast.product_forecasts.flatMap((pf) => pf.forecast_30d ?? []),
    (x: ForecastDataPoint) => x.predicted_quantity
  )
  const agg30 = aggregateToMonthly(raw30)
  const forecast30d: ForecastDataPoint[] = agg30.map((x) => ({
    date: x.date,
    predicted_quantity: x.quantity,
    lower_bound: x.quantity * 0.8,
    upper_bound: x.quantity * 1.2,
  }))

  const raw60 = sumByDate(
    forecast.product_forecasts.flatMap((pf) => pf.forecast_60d ?? []),
    (x: ForecastDataPoint) => x.predicted_quantity
  )
  const agg60 = aggregateToMonthly(raw60)
  const forecast60d: ForecastDataPoint[] = agg60.map((x) => ({
    date: x.date,
    predicted_quantity: x.quantity,
    lower_bound: x.quantity * 0.8,
    upper_bound: x.quantity * 1.2,
  }))

  const raw90 = sumByDate(
    forecast.product_forecasts.flatMap((pf) => pf.forecast_90d ?? []),
    (x: ForecastDataPoint) => x.predicted_quantity
  )
  const agg90 = aggregateToMonthly(raw90)
  const forecast90d: ForecastDataPoint[] = agg90.map((x) => ({
    date: x.date,
    predicted_quantity: x.quantity,
    lower_bound: x.quantity * 0.8,
    upper_bound: x.quantity * 1.2,
  }))

  // Debug log (ver corpo em analysis-helpers.ts)
  return { historical, forecast30d, forecast60d, forecast90d }
}
```

(As funções auxiliares `sumByDate`, `shouldAggregateToMonthly` e `aggregateToMonthly` estão no mesmo arquivo acima de `getAggregatedChartData`.)

### Como monta "Vendas Totais"

- **Histórico:** concatena `historical_data` de todos os `product_forecasts`, depois **soma por data** com `sumByDate` (um ponto por data com quantidade = soma de todos os produtos).
- **30d / 60d / 90d:** para cada horizonte:
  - Concatena `forecast_30d` (ou `forecast_60d` ou `forecast_90d`) de **todos** os produtos.
  - **Soma por data** com `sumByDate` (um ponto por data com `predicted_quantity` = soma de todos os produtos naquela data).
  - Se `shouldAggregateToMonthly` for true (intervalo médio entre datas < 25 dias), aplica `aggregateToMonthly` (agrupa por mês YYYY-MM e soma).

### Decisão de horizonte

- **getAggregatedChartData não decide horizonte.** Ela **sempre** calcula e devolve as três séries: `forecast30d`, `forecast60d`, `forecast90d`.
- Quem escolhe qual série exibir é o **componente do gráfico**, usando `selectedHorizon` (30d / 60d / 90d).

---

## 2. FRONTEND – Quem chama getAggregatedChartData e como usa o horizonte

### Componente que chama: `GeneralTab` (components/dashboard/analysis/GeneralTab.tsx)

Trecho relevante:

```tsx
// selectedPeriod vem das props (ex.: 30, 60 ou 90 do PeriodSelector no dashboard)
const selectedPeriod = ... // default 30
const selectedHorizon = `${selectedPeriod}d` as '30d' | '60d' | '90d'

// chartData contém AS TRÊS séries; não filtra por horizonte aqui
const chartData =
  viewMode === 'total' || selectedCategory === 'all'
    ? getAggregatedChartData(forecast)
    : getCategoryChartData(forecast, selectedCategory)

// O gráfico recebe as 3 séries e o horizonte; ELE escolhe qual série desenhar
<ForecastChart
  historical={chartData.historical}
  forecast30d={chartData.forecast30d}
  forecast60d={chartData.forecast60d}
  forecast90d={chartData.forecast90d}
  selectedHorizon={selectedHorizon}
  productName={...}
/>
```

### Uso de selectedPeriod / selectedHorizon

- **selectedPeriod** (30 | 60 | 90): vem do `PeriodSelector` no dashboard; o usuário escolhe “30 dias”, “60 dias” ou “90 dias”.
- **selectedHorizon** = `"30d"` | `"60d"` | `"90d"`: é só o mesmo valor em string para o gráfico.
- **getAggregatedChartData(forecast)** é chamada **uma vez** e devolve sempre `forecast30d`, `forecast60d`, `forecast90d`. Não há filtro por horizonte nessa função.
- O **ForecastChart** usa `selectedHorizon` para escolher **qual** das três séries desenhar, por exemplo:
  - `forecastData = selectedHorizon === '30d' ? forecast30d : selectedHorizon === '60d' ? forecast60d : forecast90d`

Ou seja: os dados de 30d/60d/90d vêm todos do mesmo `forecast`; o horizonte só escolhe qual série exibir no gráfico.

---

## 3. DADOS – O que está em forecast_results.response

- A tabela **forecast_results** guarda, por análise, o JSON completo da resposta do backend em **response** (ver `lib/services/run-forecast.ts`: `persistForecastResult` grava `response` e `getForecastFromDb` lê `response`).
- Esse `response` é um **ForecastResponse**: tem `product_forecasts[]`, e cada item tem `forecast_30d`, `forecast_60d`, `forecast_90d` (listas de pontos com `date`, `predicted_quantity`, `lower_bound`, `upper_bound`).

### Como inspecionar para um produto (ex.: "Kissen-Inlett Sia")

1. **Pelo Supabase (SQL ou Table Editor)**  
   - Abrir a tabela `forecast_results`.  
   - Coluna `response` é JSONB.  
   - Para uma `analysis_id` usada no dashboard, abrir o `response` e navegar:  
     `response -> product_forecasts -> [produto com product_name = "Kissen-Inlett Sia"]`.

2. **O que anotar para esse produto**
   - **forecast_30d:** `length`; primeiro ponto: `date`, `predicted_quantity`; último ponto: idem.
   - **forecast_60d:** idem.
   - **forecast_90d:** idem.
   - **Diário vs mensal:** diferença em dias entre as `date` de dois pontos consecutivos. Se ~1 dia → diário; se ~28–31 dias → mensal.

3. **Exemplo de query SQL (read-only) no Supabase**
   - Para listar um produto e tamanhos:
   ```sql
   select
     response->'product_forecasts'->0->>'product_name' as product_name,
     jsonb_array_length(response->'product_forecasts'->0->'forecast_30d') as len_30d,
     jsonb_array_length(response->'product_forecasts'->0->'forecast_60d') as len_60d,
     jsonb_array_length(response->'product_forecasts'->0->'forecast_90d') as len_90d
   from forecast_results
   where analysis_id = '<sua_analysis_id>';
   ```
   - Para primeiro/último valor de 60d do primeiro produto:
   ```sql
   select
     response->'product_forecasts'->0->'forecast_60d'->0->>'predicted_quantity' as first_60d,
     response->'product_forecasts'->0->'forecast_60d'->-1->>'predicted_quantity' as last_60d
   from forecast_results
   where analysis_id = '<sua_analysis_id>';
   ```
   (Sintaxe pode variar conforme o Supabase; -1 para último elemento pode não ser suportado em todos os casos.)

Com isso você vê exatamente o tamanho e os valores de forecast_30d/60d/90d por produto e se os pontos são diários ou mensais.

---

## 4. BACKEND – Log temporário antes de retornar a resposta

Adicionado em **profeta-forecaster/models/forecaster.py**, logo antes de `return response`, um log dos primeiros 2 produtos com tamanho e primeiro/último valor de forecast_30d, forecast_60d e forecast_90d (ver alteração no arquivo).

---

## 5. FRONTEND – Log em produção

O log `[getAggregatedChartData] Vendas Totais` foi alterado para rodar sempre no browser (removida a condição `process.env.NODE_ENV === 'development'`), mantendo apenas `typeof window !== 'undefined'`, para poder ver os valores reais também em produção.

---

## 6. ANÁLISE DOS LOGS (frontend + backend)

### O que o frontend mostrou

```
raw:        { 30: 1, 60: 3, 90: 3 }
afterAgg:   { 30: 1, 60: 3, 90: 3 }
avgGapDays: { 30: '0.0', 60: '29.5', 90: '29.5' }
sample60d:  [146859.64, 586.81]
sample90d:  [146867.32, 126653.92]
```

- **30d:** 1 ponto (mensal), correto.
- **60d / 90d:** 3 pontos cada, intervalo médio ~29,5 dias → backend já entrega **mensal**; o frontend **não** reagrega (avgGap ≥ 25).
- O problema não é agregação no frontend: os **valores** que chegam já estão altos. Ex.: primeiro mês 60d = **146.859** (soma de todos os produtos naquela data).

### O que o backend mostrou (por produto, FINAL após agregação mensal)

Exemplos dos logs:

- **Deckenleuchte Cecillia:** forecast_60d = `[4452, 22002, 28]` — segundo mês **22k** para um produto.
- **Kissen-Inlett Sia:** forecast_60d = `[5530, 7020, 104]`.
- **Kristall-Rotweingläser:** forecast_60d = `[19535, 3833, 106]`, forecast_90d = `[19535, 3833, 78571]` — terceiro mês **78k** para um produto.

Somando todos os produtos por mês, os totais batem com o que o frontend vê (ex.: ~146k no primeiro mês de 60d). Ou seja, a **soma** no frontend está correta; os **valores por produto** que saem do backend para 60d/90d é que estão inflados em vários meses.

### Categoria (não usado em Vendas Totais, mas mostra o mesmo padrão)

Logs de categoria também mostram valores absurdos por mês, ex.:

- `[Têxteis > Almofadas] forecast_60d: [2191, 616714, 1065]` — segundo mês **616k**.
- `[Iluminação > Lâmpadas > LED] forecast_60d: [78783, 715907, 0]`.
- `[Cozinha > Utensílios de Mesa > Copos] forecast_30d: [303065]`.

Isso indica que o problema é **no backend**: Prophet (ou ensemble) está gerando, para certos meses, valores diários muito altos; ao agregar com `_aggregate_daily_to_monthly` (soma dos dias do mês), um único mês fica com dezenas ou centenas de milhares.

### Conclusão da investigação

| Onde | O que está certo | O que está errado |
|------|-------------------|-------------------|
| **Frontend** | Soma por data; decisão de não reagregar quando avgGap ≥ 25; 30d com 1 ponto. | Nada: só exibe o que a API envia. |
| **Backend** | Agregação a mensal (_is_historical_monthly + _aggregate_daily_to_monthly); 30d por produto razoável (~600–1.6k). | Valores **por mês** em 60d/90d (e em categoria): alguns meses saem com 20k–78k por produto (ou 300k+ por categoria). Origem: ensemble/Prophet gerando dias com valores altos que, somados no mês, explodem. |

**Causa raiz:** Prophet (e/ou o ensemble) está produzindo, para horizontes 60d/90d, previsões **diárias** com picos muito altos em certos dias/meses. Ao agregar esses dias em um único ponto mensal, esse mês fica com valor absurdo. A correção precisa ser no **backend**: limitar/cap por produto ou por mês, ou revisar a lógica do ensemble/Prophet para 60d/90d (ex.: uso de XGBoost puro quando Prophet estoura, ou clamp da soma mensal com base no histórico).
