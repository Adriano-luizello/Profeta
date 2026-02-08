# Teste: Status Persistido no Pipeline

## ✅ Mudanças Implementadas

**Problema**: Pipeline rodava sem feedback de progresso. Se falhava no meio, o usuário não sabia onde.

**Solução**: Status persistido em cada etapa do pipeline para tracking em tempo real.

---

## 🎯 Arquivos Modificados

### 1. Migration
- `supabase/migrations/019_pipeline_status_tracking.sql` — **NOVO**
  - Adiciona campo `pipeline_started_at`
  - Adiciona índice por status
  - Adiciona comentários de documentação

### 2. Backend Core
- `lib/services/update-pipeline-status.ts` — **NOVO**
  - Função helper centralizada para atualizar status
  - Logging padronizado com emojis
  - Gerencia timestamps automáticos

### 3. Pipeline Route
- `app/api/analyses/[id]/pipeline/route.ts` — **MODIFICADO**
  - Usa `updatePipelineStatus()` antes/depois de cada etapa
  - Try/catch global para capturar erros não tratados
  - Atualiza status='forecasting' antes de runForecast
  - Atualiza status='completed' ao final
  - Atualiza status='failed' em qualquer erro

### 4. Run Clean
- `lib/services/run-clean.ts` — **MODIFICADO**
  - Usa `updatePipelineStatus()` com `markAsStarted: true` no início
  - Usa `updatePipelineStatus()` com erro específico em falhas
  - Remove atualização de status='completed' (deixa para o pipeline)

### 5. Status Endpoint
- `app/api/analyses/[id]/status/route.ts` — **NOVO**
  - GET endpoint para polling do status atual
  - Retorna: status, error_message, timestamps, contadores

---

## 🧪 Como Testar

### Passo 1: Aplicar Migration

```bash
npx supabase db push
# OU via Supabase Studio SQL Editor: colar conteúdo do 019_pipeline_status_tracking.sql
```

**Verificar:**
```sql
-- Campo deve existir
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'analyses' 
AND column_name = 'pipeline_started_at';
```

### Passo 2: Rodar Pipeline

1. **Upload CSV** via dashboard
2. **Observar logs** no terminal

**Logs esperados:**

```
🧹 Status: cleaning → 47727dab...
[Clean] Total: 5456ms | 10 produtos | Custo: $0.0047
🔮 Status: forecasting → 47727dab...
[Forecast] Total: 4.3s | FE: 0.2s | XGB: 1.7s | XGB Cat: 0.5s | Prophet: DESATIVADO
✅ Status: completed → 47727dab...
[Pipeline] Total: 16682ms | Clean: 6869ms | Forecast: 9733ms
```

### Passo 3: Verificar Status no Banco

Durante a execução, consultar o status em tempo real:

```sql
SELECT 
  id,
  status,
  error_message,
  pipeline_started_at,
  completed_at,
  total_products,
  processed_products,
  created_at,
  updated_at
FROM analyses
WHERE id = 'SEU_ANALYSIS_ID'
ORDER BY updated_at DESC
LIMIT 1;
```

**Transições esperadas:**
1. `status = 'uploading'` (após POST /api/analyses)
2. `status = 'cleaning', pipeline_started_at != NULL` (início do pipeline)
3. `status = 'forecasting'` (após limpeza bem-sucedida)
4. `status = 'completed', completed_at != NULL` (fim bem-sucedido)

**Em caso de erro:**
- `status = 'failed'`
- `error_message` com descrição específica (ex: "Erro na limpeza: timeout")
- `completed_at != NULL`

### Passo 4: Testar Endpoint de Status

```bash
# Pegar o analysisId de uma análise em andamento
ANALYSIS_ID="47727dab-6c41-4ec9-afa4-c1d27d87b040"

# Consultar status via API
curl http://localhost:3005/api/analyses/$ANALYSIS_ID/status \
  -H "Cookie: sb-access-token=YOUR_TOKEN"
```

**Response esperado:**
```json
{
  "status": "forecasting",
  "error_message": null,
  "pipeline_started_at": "2026-02-08T13:07:54.000Z",
  "completed_at": null,
  "total_products": 10,
  "processed_products": 10
}
```

---

## 🔍 Cenários de Teste

### Cenário 1: Pipeline Bem-Sucedido ✅

**Passos:**
1. Upload CSV válido com 10 produtos
2. Pipeline executa completamente

**Verificações:**
- [ ] Logs mostram transições: cleaning → forecasting → completed
- [ ] `pipeline_started_at` definido na primeira etapa
- [ ] `completed_at` definido ao final
- [ ] `error_message` é NULL
- [ ] Status final é 'completed'

### Cenário 2: Falha na Limpeza ❌

**Simular:**
- Modificar `run-clean.ts` temporariamente para lançar erro

**Verificações:**
- [ ] Status muda para 'failed' após erro
- [ ] `error_message` contém "Erro na limpeza: ..."
- [ ] `completed_at` é definido
- [ ] Logs mostram "❌ Status: failed (Erro na limpeza: ...)"

### Cenário 3: Falha no Forecast ❌

**Simular:**
- Desligar Python forecaster (porta 8000)

**Verificações:**
- [ ] Status muda para 'cleaning' → 'forecasting' → 'failed'
- [ ] `error_message` contém "Erro no forecast: ..."
- [ ] `completed_at` é definido
- [ ] Response HTTP retorna 400 com `{ error: "...", clean: true }`

### Cenário 4: Polling de Status (Frontend) 🔄

**Simular:**
- Abrir DevTools → Console
- Colar script de polling enquanto pipeline roda

```javascript
const analysisId = 'SEU_ANALYSIS_ID';
const pollStatus = setInterval(async () => {
  const res = await fetch(`/api/analyses/${analysisId}/status`);
  const data = await res.json();
  console.log(`[${new Date().toISOString()}] Status: ${data.status}`);
  
  if (data.status === 'completed' || data.status === 'failed') {
    clearInterval(pollStatus);
    console.log('Pipeline finalizado:', data);
  }
}, 2000);
```

**Output esperado:**
```
[2026-02-08T13:07:55.000Z] Status: cleaning
[2026-02-08T13:07:57.000Z] Status: cleaning
[2026-02-08T13:07:59.000Z] Status: forecasting
[2026-02-08T13:08:01.000Z] Status: forecasting
[2026-02-08T13:08:03.000Z] Status: completed
Pipeline finalizado: { status: 'completed', ... }
```

---

## ✅ Critérios de Sucesso

Backend:
- [x] Campo `pipeline_started_at` existe na tabela `analyses`
- [x] Status atualizado em cada transição: pending → cleaning → forecasting → completed
- [x] Em erro: status = `failed` com mensagem descritiva em `error_message`
- [x] Logs mostram transições com emojis e análise ID
- [x] Endpoint `/api/analyses/[id]/status` retorna dados corretos

Comportamento:
- [ ] Pipeline bem-sucedido: status='completed', sem error_message
- [ ] Falha na limpeza: status='failed', error_message="Erro na limpeza: ..."
- [ ] Falha no forecast: status='failed', error_message="Erro no forecast: ..."
- [ ] Timestamps corretos: pipeline_started_at no início, completed_at no fim

---

## 📊 Comparação: Antes vs Depois

### ANTES (Problema)
```
Pipeline rodando...
[45s depois]
❌ Erro genérico: "Erro ao processar pipeline"
❓ Onde falhou? Limpeza? Forecast? Não sei!
```

**Status no banco:**
```sql
status = 'uploading'  -- nunca mudou!
error_message = NULL   -- sem info
```

### DEPOIS (Solução)
```
🧹 Status: cleaning → 47727dab...
[Clean] Total: 5456ms | 10 produtos
🔮 Status: forecasting → 47727dab...
❌ Status: failed (Erro no forecast: connection timeout) → 47727dab...
```

**Status no banco:**
```sql
status = 'failed'
error_message = 'Erro no forecast: connection timeout'
pipeline_started_at = '2026-02-08T13:07:54.000Z'
completed_at = '2026-02-08T13:07:59.000Z'
```

✅ **Usuário sabe exatamente onde falhou e por quê!**

---

## 🚀 Próximos Passos (Opcional)

### Frontend com Polling (P3 #13)

Atualizar `app/dashboard/upload/page.tsx` para fazer polling real:

```typescript
// Substituir loader estático por polling dinâmico
const [pipelineStatus, setPipelineStatus] = useState<'cleaning' | 'forecasting' | 'completed' | 'failed'>('cleaning');

useEffect(() => {
  if (step === 'saving' && analysisId) {
    const pollInterval = setInterval(async () => {
      const res = await fetch(`/api/analyses/${analysisId}/status`);
      const data = await res.json();
      
      setPipelineStatus(data.status);
      
      if (data.status === 'completed') {
        clearInterval(pollInterval);
        setStep('done');
        // redirect para dashboard
      }
      
      if (data.status === 'failed') {
        clearInterval(pollInterval);
        setError(data.error_message || 'Erro no pipeline');
        setStep('upload');
      }
    }, 2000);
    
    return () => clearInterval(pollInterval);
  }
}, [step, analysisId]);
```

**UI atualizada:**
```
✓ Upload completado
✓ Limpeza de dados (10 produtos) [se status >= 'forecasting']
● Gerando previsões...           [se status === 'forecasting']
✓ Concluído                      [se status === 'completed']
```

---

## 🎉 Benefícios

1. **Visibilidade**: Saber exatamente onde o pipeline está
2. **Debugging**: Erro específico por etapa ("falhou na limpeza" vs "falhou no forecast")
3. **Recovery**: Possibilidade de retry em etapa específica (futuro)
4. **Monitoring**: Logs estruturados para análise de performance
5. **UX**: Base para mostrar progresso real no frontend (polling)

---

## 🐛 Troubleshooting

### Status não atualiza
**Causa**: Migration não aplicada
**Solução**: `npx supabase db push`

### Endpoint /status retorna 404
**Causa**: Route não criado corretamente
**Solução**: Verificar se arquivo existe em `app/api/analyses/[id]/status/route.ts`

### Logs não aparecem
**Causa**: Console não mostra logs do backend
**Solução**: Verificar terminal onde Next.js está rodando (não o browser)

### Status fica em 'cleaning' forever
**Causa**: Pipeline travou ou runClean não completou
**Solução**: Verificar logs de erro do Python ou GPT-4
