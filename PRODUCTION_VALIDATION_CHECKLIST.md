# ✅ Production Validation Checklist — P1 Deploy

**Data:** 2026-02-08  
**Status:** Migrations já aplicadas, ready para validação

---

## 🎯 Resumo Executivo

### ✅ Ambiente Único (Dev = Prod)
- **Supabase:** `hkrbqmdigjonqrgofgms.supabase.co` (usado tanto em dev quanto em prod)
- **Status:** ACTIVE_HEALTHY
- **Region:** eu-west-2

### ✅ Migrations Aplicadas
- **Migration 018:** `rate_limits` table ✅ (já aplicada)
- **Migration 019:** `pipeline_started_at` field + índice ✅ (já aplicada)

### 🚀 Vercel
- **Project:** profeta-analytics
- **URL:** https://profeta-analytics.vercel.app
- **Latest Deploy:** READY (production)
- **Framework:** Next.js 24.x

---

## 🔍 Validação Completa das Migrations

### Migration 018: Rate Limits ✅

**Tabela `rate_limits` confirmada:**
```sql
-- Campos verificados:
✅ id (uuid, PK)
✅ user_id (uuid, FK para auth.users)
✅ minute_count (integer, default 0)
✅ minute_window (timestamptz, default now())
✅ day_count (integer, default 0)
✅ day_tokens_used (integer, default 0)
✅ day_window (date, default CURRENT_DATE)
✅ updated_at (timestamptz, default now())
```

**Status:** Completa e funcional

### Migration 019: Pipeline Status Tracking ✅

**Campo `pipeline_started_at` confirmado:**
```sql
-- Verificado na tabela analyses:
✅ pipeline_started_at (timestamptz)
✅ Índice idx_analyses_status_created (status, created_at DESC)
```

**Status:** Completa e funcional

---

## 📋 Checklist de Validação em Produção

### 1. Verificar Vercel Deploy ✅
- [x] Latest deploy está READY
- [x] URL de produção: https://profeta-analytics.vercel.app
- [ ] **AÇÃO:** Acessar URL e verificar que app carrega

### 2. Verificar Environment Variables
- [x] Supabase URL configurada (mesma do dev)
- [ ] **AÇÃO:** Verificar no Vercel Dashboard:
  - Settings → Environment Variables
  - Confirmar que `SUPABASE_SERVICE_ROLE_KEY` está definida
  - Confirmar que `NEXT_PUBLIC_SUPABASE_URL` aponta para `hkrbqmdigjonqrgofgms`

### 3. Testar Upload Flow
- [ ] **AÇÃO:** Fazer upload de CSV de teste
- [ ] **AÇÃO:** Verificar que pipeline inicia
- [ ] **AÇÃO:** Verificar logs no Vercel (Functions → realtime logs)
- [ ] **AÇÃO:** Esperado:
  ```
  [Pipeline] 🧹 Status: cleaning → {analysis_id}
  [Clean] Total: ~3-5s | {N} produtos
  [Pipeline] 🔮 Status: forecasting → {analysis_id}
  [Forecast] Total: ~5-10s | Prophet: DESATIVADO
  [Pipeline] ✅ Status: completed → {analysis_id}
  ```

### 4. Validar Status Tracking
- [ ] **AÇÃO:** Durante o upload, fazer polling do status:
  ```bash
  # Substituir {ANALYSIS_ID} pelo ID real
  curl https://profeta-analytics.vercel.app/api/analyses/{ANALYSIS_ID}/status
  ```
- [ ] **AÇÃO:** Esperado:
  ```json
  {
    "status": "cleaning",  // depois "forecasting", depois "completed"
    "error_message": null,
    "pipeline_started_at": "2026-02-08T...",
    "completed_at": null  // ou timestamp quando completar
  }
  ```

### 5. Validar Dashboard
- [ ] **AÇÃO:** Após pipeline completar, abrir dashboard
- [ ] **AÇÃO:** Verificar que categorias aparecem (não vazio)
- [ ] **AÇÃO:** Verificar gráficos carregam
- [ ] **AÇÃO:** Verificar que KPIs estão corretos
- [ ] **AÇÃO:** Verificar "Supply Chain Intelligence" funciona

### 6. Validar Chat/AI
- [ ] **AÇÃO:** Abrir chat no dashboard
- [ ] **AÇÃO:** Fazer pergunta: "Quais produtos estão em risco?"
- [ ] **AÇÃO:** Verificar que responde sem erro
- [ ] **AÇÃO:** Verificar rate limiting funcionando (10 msgs/min)
- [ ] **AÇÃO:** Esperado após 10 mensagens:
  ```
  429 Too Many Requests
  "Limite de 10 mensagens por minuto atingido"
  ```

### 7. Validar Performance
- [ ] **AÇÃO:** Cronometrar tempo de upload → dashboard
- [ ] **AÇÃO:** Esperado para 10 produtos: < 20s total
- [ ] **AÇÃO:** Verificar logs mostram Prophet DESATIVADO
- [ ] **AÇÃO:** Verificar categorias geradas em < 1s

### 8. Validar Error Handling
- [ ] **AÇÃO:** Fazer upload de CSV inválido (formato errado)
- [ ] **AÇÃO:** Esperado: erro claro na UI, status='failed'
- [ ] **AÇÃO:** Verificar `error_message` no banco tem descrição útil

---

## 🚨 Troubleshooting

### Se Rate Limiting não Funcionar
**Sintoma:** Chat aceita mais de 10 mensagens/min sem bloquear

**Verificar:**
1. `SUPABASE_SERVICE_ROLE_KEY` está definida no Vercel?
2. Backend está usando `createServiceRoleClient()` para rate_limits?
3. Tabela `rate_limits` tem RLS ativa? (deve ter)

**Fix:**
```bash
# No Vercel Dashboard:
Settings → Environment Variables → Add
# Obter no Supabase: Settings → API → service_role (secret)
SUPABASE_SERVICE_ROLE_KEY=<sua-service-role-key>
```

### Se Status não Atualiza
**Sintoma:** Status fica "uploading" ou não muda

**Verificar:**
1. Campo `pipeline_started_at` existe na tabela analyses?
2. Helper `updatePipelineStatus()` está sendo chamado?
3. Logs do Vercel mostram as chamadas?

**Query para verificar:**
```sql
SELECT id, status, pipeline_started_at, completed_at, error_message
FROM analyses
ORDER BY created_at DESC
LIMIT 5;
```

### Se Categorias Vazias
**Sintoma:** `category_forecasts` retorna `[]`

**Verificar:**
1. Logs mostram "Categorias XGBoost agregadas"?
2. Produtos têm campo `category` preenchido?
3. Python forecaster está rodando versão atualizada?

**Query para verificar:**
```sql
SELECT category, COUNT(*) as products
FROM products
WHERE analysis_id = '{ANALYSIS_ID}'
GROUP BY category;
```

### Se Performance Lenta (> 30s)
**Sintoma:** Pipeline leva > 30s para 10 produtos

**Verificar:**
1. Logs mostram "Prophet DESATIVADO"?
2. XGBoost rodando em paralelo? (timing < 3s)
3. Python forecaster tem CPU/memória suficiente?

**Esperado nos logs:**
```
[Forecast] Total: ~5s | FE: 0.3s | XGB: 2.2s | XGB Cat: 0.7s
[Forecast] Prophet: DESATIVADO (dados mensais)
```

---

## 📊 Métricas de Sucesso

| Métrica | Target | Como Medir |
|---------|--------|------------|
| **Pipeline Total** | < 20s (10 produtos) | Logs ou timing no terminal |
| **Upload → Dashboard** | < 25s | Cronômetro manual |
| **Categories Populated** | 5-6 categorias | Dashboard ou API response |
| **Status Tracking** | Transições visíveis | GET /api/analyses/[id]/status |
| **Rate Limiting** | 429 após 10 msgs | Console do browser |
| **Error Messages** | Específicos por etapa | Logs + campo error_message |

---

## 🎯 Comandos Úteis para Validação

### 1. Verificar últimas análises
```sql
SELECT 
  id, 
  status, 
  pipeline_started_at,
  completed_at,
  error_message,
  (SELECT COUNT(*) FROM products WHERE analysis_id = analyses.id) as product_count
FROM analyses
ORDER BY created_at DESC
LIMIT 10;
```

### 2. Verificar rate limiting de um usuário
```sql
SELECT *
FROM rate_limits
WHERE user_id = '{USER_ID}'
LIMIT 1;
```

### 3. Verificar forecasts gerados
```sql
SELECT 
  p.name as product_name,
  p.category,
  COUNT(DISTINCT f.id) as forecast_count,
  MAX(f.created_at) as last_forecast
FROM products p
LEFT JOIN forecasts f ON f.product_id = p.id
WHERE p.analysis_id = '{ANALYSIS_ID}'
GROUP BY p.id, p.name, p.category;
```

### 4. Poll status via API
```bash
# Substituir ANALYSIS_ID
ANALYSIS_ID="your-analysis-id-here"
URL="https://profeta-analytics.vercel.app"

# Loop a cada 2s
while true; do
  curl -s "$URL/api/analyses/$ANALYSIS_ID/status" | jq
  sleep 2
done
```

---

## ✅ Checklist Resumido

- [ ] App carrega em https://profeta-analytics.vercel.app
- [ ] Env vars configuradas no Vercel
- [ ] Upload de CSV funciona
- [ ] Status tracking atualiza (cleaning → forecasting → completed)
- [ ] Dashboard mostra categorias (não vazio)
- [ ] Pipeline < 20s para 10 produtos
- [ ] Logs mostram "Prophet DESATIVADO"
- [ ] Chat funciona e aplica rate limiting
- [ ] Error messages são claras quando algo falha

---

**✅ SE TODOS OS ITENS ACIMA PASSAREM: P1 ESTÁ 100% EM PRODUÇÃO!** 🎉

---

## 📞 Próximos Passos Após Validação

1. **Monitoramento:** Configurar alertas no Vercel para erros 500
2. **Analytics:** Adicionar tracking de uso (Vercel Analytics ou Posthog)
3. **Documentação:** Atualizar README com novo fluxo
4. **P2:** Começar implementação de melhorias do dashboard

---

**Última atualização:** 2026-02-08
