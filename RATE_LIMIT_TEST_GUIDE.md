# Rate Limit + Message Size — Guia de Teste

## ✅ Implementação Completa

### Arquivos Criados/Modificados

| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `supabase/migrations/018_rate_limits.sql` | ✅ CRIADO | Tabela `rate_limits` com RLS service-only |
| `lib/rate-limit.ts` | ✅ CRIADO | Funções `checkRateLimit()` e `recordTokenUsage()` |
| `app/api/chat/route.ts` | ✅ EDITADO | Validações + rate limit + registro de tokens |
| `components/chat/ChatSidebar.tsx` | ✅ EDITADO | Tratamento de erros 413 e 429 |

---

## 🔧 Passo 1: Aplicar Migration

Execute a migration para criar a tabela `rate_limits`:

```bash
# Se usar Supabase CLI local
npx supabase db push

# OU via Supabase Studio
# 1. Abra https://supabase.com/dashboard
# 2. Vá em Database > Migrations
# 3. Execute o conteúdo de supabase/migrations/018_rate_limits.sql
```

### Verificar que a tabela foi criada:

```sql
-- No SQL Editor do Supabase Studio
SELECT * FROM public.rate_limits;
-- Deve retornar vazio (nenhum registro ainda)

-- Verificar RLS está ativo
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'rate_limits';
-- rowsecurity deve ser TRUE
```

---

## 🧪 Passo 2: Testes

### Teste 1: Mensagem muito longa (413)

1. **Preparar mensagem:** Copie um texto com mais de 2000 caracteres
2. **Colar no chat** e enviar
3. **Resultado esperado:**
   - ❌ Mensagem **NÃO** é adicionada ao histórico
   - ✅ Erro exibido: `📏 **Mensagem muito longa** / Sua mensagem tem X caracteres...`
   - ✅ Status HTTP: 413

### Teste 2: Rate limit por minuto (429)

1. **Abrir console de desenvolvedor** (F12)
2. **Colar este script** no console:

```javascript
// Enviar 11 mensagens rapidamente (limite é 10/min)
for (let i = 1; i <= 11; i++) {
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      message: `Teste ${i}`,
      conversationHistory: []
    })
  }).then(res => {
    console.log(`Request ${i}: ${res.status} - ${res.statusText}`)
    return res.json()
  }).then(data => console.log(data))
}
```

3. **Resultado esperado:**
   - ✅ Primeiras 10 requisições: status 200 (sucesso)
   - ✅ 11ª requisição: status 429 (rate limit)
   - ✅ Response da 11ª: `{ error: "rate_limit", message: "Limite de 10 mensagens por minuto atingido..." }`
   - ✅ Header `Retry-After` presente (ex: "45" segundos)

4. **Aguardar 60 segundos** e enviar nova mensagem
   - ✅ Deve funcionar normalmente

### Teste 3: Interface do chat mostra erro amigável

1. **Enviar mensagem muito longa** via UI (não console)
2. **Resultado esperado:**
   - ✅ Mensagem de erro aparece no chat como resposta do assistente
   - ✅ Formato: `📏 **Mensagem muito longa**` + detalhes

3. **Enviar 11 mensagens rápidas** via UI
   - ✅ 11ª mostra: `⏱️ **Limite de uso atingido**` + mensagem + tempo de espera

### Teste 4: Registro de tokens

1. **Enviar uma mensagem normal** no chat
2. **Verificar no Supabase:**

```sql
SELECT 
  user_id,
  minute_count,
  day_count,
  day_tokens_used,
  day_window,
  updated_at
FROM public.rate_limits
WHERE user_id = 'SEU_USER_ID';
```

3. **Resultado esperado:**
   - ✅ `minute_count` incrementado
   - ✅ `day_count` incrementado
   - ✅ `day_tokens_used` > 0 (ex: 500-2000 tokens dependendo da pergunta)
   - ✅ `day_window` = data atual (YYYY-MM-DD)

### Teste 5: Truncamento de histórico (50 mensagens)

1. **Simular conversa longa** (console):

```javascript
// Gerar histórico com 55 mensagens
const history = [];
for (let i = 0; i < 55; i++) {
  history.push({ role: i % 2 === 0 ? 'user' : 'assistant', content: `Msg ${i}` });
}

fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    message: 'Nova pergunta',
    conversationHistory: history
  })
}).then(res => res.json()).then(data => {
  console.log('Histórico retornado tem', data.conversationHistory.length, 'mensagens')
  console.log('Esperado: <= 51 (50 antigas + 1 nova)')
})
```

2. **Resultado esperado:**
   - ✅ `conversationHistory` retornado tem no máximo 51 mensagens
   - ✅ Mensagens mais antigas foram removidas (truncadas)

---

## 📊 Limites Configurados

| Limite | Valor | Localização |
|--------|-------|-------------|
| **Tamanho da mensagem** | 2000 caracteres | `app/api/chat/route.ts:18` |
| **Mensagens no contexto** | 50 mensagens | `app/api/chat/route.ts:19` |
| **Requests por minuto** | 10 requests | `lib/rate-limit.ts:6` |
| **Requests por dia** | 200 requests | `lib/rate-limit.ts:7` |
| **Tokens por dia** | 100.000 tokens | `lib/rate-limit.ts:8` |

### Para ajustar limites:

Edite as constantes em:
- **Frontend:** `app/api/chat/route.ts` (linhas 18-19)
- **Backend:** `lib/rate-limit.ts` (linhas 6-8)

---

## 🔍 Debug e Monitoramento

### Ver logs do rate limit:

```bash
# Logs do servidor Next.js
npm run dev

# Procurar por:
# [Rate Limit] Failed to check rate limit: ...
# [Rate Limit] Failed to record token usage: ...
# [Chat API] Failed to record token usage: ...
```

### Consultar dados de rate limit:

```sql
-- Ver todos os usuários e seus contadores
SELECT 
  u.email,
  rl.minute_count,
  rl.day_count,
  rl.day_tokens_used,
  rl.day_window,
  rl.updated_at
FROM public.rate_limits rl
JOIN auth.users u ON u.id = rl.user_id
ORDER BY rl.updated_at DESC;

-- Ver usuários próximos do limite diário
SELECT 
  user_id,
  day_count,
  day_tokens_used,
  (day_tokens_used::float / 100000.0 * 100)::int AS percent_tokens_used
FROM public.rate_limits
WHERE day_window = CURRENT_DATE
  AND (day_count >= 180 OR day_tokens_used >= 90000)
ORDER BY day_count DESC;
```

### Resetar limite de um usuário (emergência):

```sql
-- Resetar contadores de um usuário específico
UPDATE public.rate_limits
SET 
  minute_count = 0,
  minute_window = NOW(),
  day_count = 0,
  day_tokens_used = 0
WHERE user_id = 'USER_ID_AQUI';
```

---

## 🚨 Troubleshooting

### Erro: "Service role key is required"

**Causa:** Variável de ambiente `SUPABASE_SERVICE_ROLE_KEY` não configurada.

**Solução:**
```bash
# .env.local
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Obter a chave em: Supabase Dashboard > Settings > API > `service_role` (secret)

### Erro: RLS policy impede acesso

**Causa:** Tentando acessar `rate_limits` com client comum (anon key).

**Solução:** Garantir que `lib/rate-limit.ts` usa `createServiceRoleClient()`:
```typescript
const supabase = createServiceRoleClient() // ✅ Correto
// NÃO usar: const supabase = await createClient() // ❌ Errado
```

### Rate limit não está bloqueando

**Verificar:**
1. Migration foi aplicada? `SELECT * FROM rate_limits;`
2. Função está sendo chamada? (ver logs no terminal)
3. Erro silencioso? (fail open ativa se houver erro)

---

## ✅ Checklist Final

- [ ] Migration 018 aplicada e tabela `rate_limits` existe
- [ ] Teste 1: Mensagem longa retorna erro 413
- [ ] Teste 2: 11 requests rápidas retornam erro 429 na 11ª
- [ ] Teste 3: Erros aparecem de forma amigável no chat UI
- [ ] Teste 4: Tokens são registrados no banco após cada mensagem
- [ ] Teste 5: Histórico é truncado em 50 mensagens
- [ ] Logs do servidor mostram `[Rate Limit]` sem erros
- [ ] Variável `SUPABASE_SERVICE_ROLE_KEY` configurada

---

## 📈 Próximos Passos (Opcional)

### Melhorias futuras:

1. **Dashboard de uso:**
   - Página admin para ver consumo por usuário
   - Alertas quando usuários chegam próximo do limite

2. **Limites por tier:**
   - Free: 100 msgs/dia, 50k tokens
   - Pro: 500 msgs/dia, 200k tokens
   - Enterprise: ilimitado

3. **Cache de rate limit:**
   - Redis para evitar queries ao Supabase a cada request
   - Reduzir latência de 50-100ms

4. **Alertas proativos:**
   - Email/notificação quando usuário usar 80% do limite diário
   - Slack webhook para alertar admins de abuso

---

## 🎯 Custo Estimado

Com os limites atuais (200 msgs/dia, 100k tokens/dia por usuário):

| Usuários Ativos | Msgs/Dia | Tokens/Dia | Custo Claude/Mês* |
|-----------------|----------|------------|-------------------|
| 10 usuários     | 2.000    | 1M tokens  | ~$30-75           |
| 50 usuários     | 10.000   | 5M tokens  | ~$150-375         |
| 100 usuários    | 20.000   | 10M tokens | ~$300-750         |

*Baseado em Claude 3.5 Sonnet ($3-15 per 1M tokens dependendo de input/output)

**Com rate limit:** Custo máximo previsível = `usuários × 100k tokens × $0.003-0.015`

**Sem rate limit:** Custo pode ser **ilimitado** 🚨
