# Dashboard Model Router – Status e Problemas Encontrados

**Data:** 2026-02-03  
**Onde paramos:** Dashboard Model Router carrega para período 30 dias; períodos 60 e 90 tinham erro de shapes no ensemble — corrigido no código; falta validar em runtime.

---

## 1. Resumo do que é o Dashboard Model Router

- **Rota frontend:** `http://localhost:3001/dashboard/[analysisId]` (ex.: `/dashboard/1c56072c-6b47-4724-b8e6-87f290782682`).
- **API backend:** `GET /api/dashboard/{analysis_id}?period=30|60|90` (FastAPI em `profeta-forecaster`).
- **Fluxo:** Front chama Next.js `/api/dashboard/[analysisId]` (proxy) → Next chama Python `http://localhost:8000/api/dashboard/{id}?period=...` → `DashboardService` agrega produtos, XGBoost, Prophet e Model Router → devolve summary, top_best, top_worst, all_products.

---

## 2. Problemas encontrados e correções feitas

### 2.1 Backend não lia `.env` / Supabase “não configurado”

- **Sintoma:** Mensagem "Supabase não configurado" ou `supabase_url is required` ao subir o backend.
- **Causas:**
  - Backend usa apenas `profeta-forecaster/.env`; credenciais estavam só no `.env.local` da raiz (Next.js).
  - Uso de **anon key** com tabela `products` com RLS ativo (políticas com `auth.uid()`): sem usuário logado, SELECT retornava 0 linhas.
- **Correções:**
  - `main.py`: carrega `.env` e `.env.local` da raiz; mapeia `NEXT_PUBLIC_SUPABASE_*` para `SUPABASE_*`; **prioriza `SUPABASE_SERVICE_ROLE_KEY`** para contornar RLS.
  - `api/dashboard_routes.py`: `_get_supabase_client()` lê de ambos os arquivos e usa **SERVICE_ROLE_KEY** quando disponível.
  - `config/supabase_client.py`: mesma lógica (service role primeiro).
- **Arquivos:** `profeta-forecaster/main.py`, `profeta-forecaster/api/dashboard_routes.py`, `profeta-forecaster/config/supabase_client.py`, `profeta-forecaster/env.example.txt`.

### 2.2 “Failed to fetch” no front (porta 3001)

- **Sintoma:** Chamada direta do browser para `http://localhost:8000` de uma página em `http://localhost:3001` podia falhar (CORS ou rede).
- **Correção:** Criada rota de **proxy** no Next: `app/api/dashboard/[analysisId]/route.ts`. O front chama `/api/dashboard/{id}?period=30` (mesma origem); o servidor Next faz o request ao Python e repassa a resposta.
- **Hook:** `hooks/useDashboard.ts` passou a usar `/api/dashboard/...` em vez da URL direta do backend.
- **Arquivos:** `app/api/dashboard/[analysisId]/route.ts`, `hooks/useDashboard.ts`.

### 2.3 Dashboard retornava 500 – “unsupported operand type(s) for /: 'NoneType' and 'float'”

- **Sintoma:** Erro ao carregar dashboard; backend 500 com essa mensagem.
- **Causas prováveis:**
  - `current_stock` vindo como `None` do Supabase em `_calculate_product_status` → divisão `current_stock / daily_consumption`.
  - Possível `None` em médias ou em improvement em `_calculate_summary` ou no model_router.
- **Correções:**
  - `dashboard_service.py`: `current_stock = _to_float(product.get("current_stock")) or 0.0`; em `_calculate_summary`, improvement calculado com `avg_p`/`avg_x` garantidos não-None (fallback 0.0).
  - `model_router.py`: cálculo de `improvement` em RULE 1 protegido quando `xgboost_mape` ou `prophet_mape` é None.
- **Arquivos:** `profeta-forecaster/services/dashboard_service.py`, `profeta-forecaster/services/model_router.py`.

### 2.4 Tipos numéricos (Decimal) do Supabase

- **Sintoma:** Erros de tipo ou serialização ao usar `mape`, `confidence_score`, etc.
- **Correção:** Helper `_to_float()` em `dashboard_service.py` e uso em: leitura de mape/mae/confidence do XGBoost e Prophet, e nas listas de `_calculate_summary` (confidences, xgb_mapes, prophet_mapes, total_forecast).
- **Arquivo:** `profeta-forecaster/services/dashboard_service.py`.

### 2.5 Períodos 60 e 90 dias – “operands could not be broadcast together with shapes (3,) (60,)”

- **Sintoma:** Para period=60 ou 90, erro no backend ao fazer ensemble: numpy reclama de shapes incompatíveis.
- **Causa:** No model_router, `calculate_ensemble_forecast` faz `xgb_array * xgb_weight + prophet_array * prophet_weight`. As listas vêm truncadas por horizonte (ex.: XGBoost com 60 dias, Prophet com 30 ou 3 pontos), então um array tem tamanho 3 e o outro 60 → broadcast falha.
- **Correção (aplicada):** Em `calculate_ensemble_forecast`, alinhar tamanhos antes do broadcast: `target_len = max(len(xgboost_forecast), len(prophet_forecast))`, preencher a série menor com zeros até `target_len`, depois fazer a média ponderada. Assim (3,) e (60,) viram (60,) e (60,).
- **Arquivo:** `profeta-forecaster/services/model_router.py` – método `calculate_ensemble_forecast`.
- **Status:** Correção feita; **falta validar** com um request real `?period=60` e `?period=90` após reiniciar o backend.

---

## 3. O que ainda não está totalmente implementado (conforme planejado)

- **Períodos 60 e 90 dias:** Lógica de horizonte e ensemble existe; o bug de shapes foi corrigido, mas pode ser necessário garantir que:
  - XGBoost e Prophet realmente devolvam séries com **60 e 90 pontos** quando `period=60` e `period=90` (hoje depende dos dados em `forecasts_xgboost` e na estrutura de `forecast_results.response` com `forecast_30d` / `forecast_60d` / `forecast_90d`).
- **Dashboard Model Router “totalmente conforme planejado”:**
  - Ver documento de design/blueprint do Model Router para checklist (ex.: métricas adicionais, filtros, export, etc.) e marcar o que já está feito e o que falta.
- **RLS no Supabase:** Tabelas `feature_store`, `forecasts_xgboost`, `model_metadata` aparecem como “RLS Disabled” (crítico no dashboard do Supabase). Decisão pendente: habilitar RLS e políticas ou manter para dev.

---

## 4. Onde paramos (próxima sessão)

1. **Validar 60 e 90 dias:** Reiniciar o backend, abrir o dashboard e alternar o seletor para 60 e 90 dias; confirmar que não há mais erro de shapes e que os números fazem sentido.
2. **Se ainda falhar para 60/90:** Verificar no backend quantos pontos cada fonte retorna (XGBoost por produto, Prophet por produto para `forecast_60d`/`forecast_90d`) e ajustar truncamento/preenchimento se necessário.
3. **Documentar** o plano completo do Dashboard Model Router e marcar itens implementados vs pendentes.
4. **Opcional:** Remover prints de debug antigos se ainda existirem em algum arquivo do backend.

---

## 5. Arquivos principais tocados nesta sessão

| Arquivo | Alterações |
|--------|------------|
| `profeta-forecaster/main.py` | Carrega .env + .env.local; prioriza SUPABASE_SERVICE_ROLE_KEY; CORS 127.0.0.1; forecaster opcional (None se sem credenciais). |
| `profeta-forecaster/api/dashboard_routes.py` | Leitura de .env + .env.local; _get_supabase_client com SERVICE_ROLE_KEY; correção do except (_read_env_file com args); resposta 500 com error/detail. |
| `profeta-forecaster/config/supabase_client.py` | Carrega .env e .env.local; usa SERVICE_ROLE_KEY; remoção de prints de debug. |
| `profeta-forecaster/services/dashboard_service.py` | _to_float(); current_stock e improvement à prova de None; conversão de mape/confidence para float. |
| `profeta-forecaster/services/model_router.py` | Proteção em RULE 1 (improvement); calculate_ensemble_forecast com alinhamento de tamanhos (pad para evitar shapes (3,) vs (60,)). |
| `app/api/dashboard/[analysisId]/route.ts` | Novo: proxy GET para backend Python. |
| `hooks/useDashboard.ts` | Chama /api/dashboard/... e exibe error/detail do backend. |
| `lib/supabase/middleware.ts` | Try/catch em getUser; checagem de env antes de createServerClient. |
| `profeta-forecaster/env.example.txt` | SUPABASE_SERVICE_ROLE_KEY e comentário. |

---

**Última atualização:** 2026-02-03.
