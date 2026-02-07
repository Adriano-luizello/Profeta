# Rate Limit + Message Size — Resumo de Implementação

## 🎯 Objetivo

Proteger custos da API do Claude implementando limites de uso no chat:
- Prevenir abuso (bots, spam)
- Controlar custos por token
- Melhorar experiência do usuário com mensagens amigáveis

**Status:** ✅ **IMPLEMENTADO E PRONTO PARA TESTE**

---

## 📦 Arquivos Modificados/Criados

### 1. **supabase/migrations/018_rate_limits.sql** (CRIADO)

Tabela de rate limiting com RLS service-only:

```sql
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  
  -- Janela de minuto
  minute_count INTEGER,
  minute_window TIMESTAMPTZ,
  
  -- Janela diária
  day_count INTEGER,
  day_tokens_used INTEGER,
  day_window DATE,
  
  updated_at TIMESTAMPTZ
);

-- RLS: apenas service_role pode acessar
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.rate_limits USING (false);
```

**Próximo passo:** Aplicar migration (`npx supabase db push`)

### 2. **lib/rate-limit.ts** (CRIADO)

Lógica de rate limiting com 3 camadas de proteção:

```typescript
// Limites configuráveis
const LIMITS = {
  REQUESTS_PER_MINUTE: 10,
  REQUESTS_PER_DAY: 200,
  TOKENS_PER_DAY: 100_000,
}

// Funções exportadas:
checkRateLimit(userId)      // Valida se pode fazer request
recordTokenUsage(userId, n) // Registra tokens usados
```

**Características:**
- ✅ Usa `createServiceRoleClient()` (bypassa RLS)
- ✅ Fail open: não bloqueia se houver erro no sistema
- ✅ Upsert automático: cria registro na primeira request
- ✅ Reset automático: minuto (60s) e diário (meia-noite)

### 3. **app/api/chat/route.ts** (EDITADO)

Integração de todas as validações no fluxo do chat:

**Constantes adicionadas:**
```typescript
const MAX_MESSAGE_LENGTH = 2000       // linha 18
const MAX_MESSAGES_IN_CONTEXT = 50    // linha 19
```

**Validações adicionadas (ordem de execução):**

1. **Autenticação** (existente) → 401 se não autenticado
2. **Tamanho da mensagem** (linha 71-82) → 413 se > 2000 chars
3. **Rate limit** (linha 85-102) → 429 se excedeu limites
4. **Truncamento de histórico** (linha 111-117) → mantém últimas 50 msgs
5. **Chamada ao Claude** (existente)
6. **Registro de tokens** (linha 186-194) → fire-and-forget após resposta

**Response format:**
- **413 Payload Too Large:** `{ error, message }`
- **429 Too Many Requests:** `{ error: 'rate_limit', message }` + header `Retry-After`

### 4. **components/chat/ChatSidebar.tsx** (EDITADO)

Tratamento de erros amigável no frontend:

**Antes:**
```typescript
if (!res.ok) throw new Error(data.error || 'Erro ao processar')
```

**Depois:**
```typescript
// Erro 413: Mensagem muito longa
if (res.status === 413) {
  setMessages([...prev, {
    type: 'assistant',
    content: '📏 **Mensagem muito longa**\n\n' + data.message
  }])
  return // NÃO adiciona ao histórico
}

// Erro 429: Rate limit
if (res.status === 429) {
  const retryAfter = res.headers.get('Retry-After')
  setMessages([...prev, {
    type: 'assistant',
    content: '⏱️ **Limite de uso atingido**\n\n' + data.message + waitMessage
  }])
  return // NÃO adiciona ao histórico
}

// Outros erros (mantido)
if (!res.ok) throw new Error(data.error)
```

**UX melhorada:**
- ❌ Não adiciona mensagem do usuário ao histórico em caso de erro 413/429
- ✅ Mostra erro como resposta do assistente (formatado)
- ✅ Exibe tempo de espera quando disponível (`Retry-After`)

---

## 🛡️ Proteções Implementadas

| Proteção | Limite | Status Code | Frontend |
|----------|--------|-------------|----------|
| **Tamanho da mensagem** | 2000 caracteres | 413 | `📏 Mensagem muito longa` |
| **Rate por minuto** | 10 requests/min | 429 | `⏱️ Limite atingido (aguarde Xs)` |
| **Rate por dia** | 200 requests/dia | 429 | `⏱️ Limite diário (reseta à meia-noite)` |
| **Tokens por dia** | 100k tokens/dia | 429 | `⏱️ Limite diário de uso atingido` |
| **Histórico** | 50 mensagens | - | Truncamento silencioso |

### Ordem de execução das validações:

```
1. Auth check → 401
2. Message size → 413
3. Rate limit (minute) → 429
4. Rate limit (day requests) → 429
5. Rate limit (day tokens) → 429
6. Claude API call → 200
7. Record tokens (async)
```

---

## 🔐 Segurança

### RLS (Row Level Security)

A tabela `rate_limits` tem RLS ativo com policy que **bloqueia todo acesso** exceto service role:

```sql
CREATE POLICY "Service role only" ON public.rate_limits
  USING (false)    -- Read: bloqueado
  WITH CHECK (false) -- Write: bloqueado
```

Isso significa:
- ✅ **Backend (service_role):** Acesso total via `createServiceRoleClient()`
- ❌ **Frontend (anon key):** Bloqueado (não pode ler nem escrever)
- ❌ **Authenticated users:** Bloqueado (não podem ver próprios limites)

### Por que service-only?

1. **Não expor limites ao frontend** — usuário não pode ver quanto "espaço" tem antes de atingir
2. **Prevenir bypass** — usuário não pode manipular contadores via client
3. **Centralizar controle** — apenas o backend decide quem pode ou não fazer request

### Variável necessária:

```bash
# .env.local
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Obter em: **Supabase Dashboard → Settings → API → service_role (secret)**

---

## 📊 Comportamento Fail Open

Se o sistema de rate limit falhar (Supabase down, erro de query, etc.):

```typescript
if (error) {
  console.error('[Rate Limit] Failed to check:', error)
  return { allowed: true } // ✅ Permitir request
}
```

**Razão:** Não bloquear usuários legítimos por falha de infraestrutura.

**Trade-off:** Em caso de outage do Supabase, rate limit não funciona (mas chat continua).

---

## 🧪 Como Testar

Ver guia detalhado: **[RATE_LIMIT_TEST_GUIDE.md](./RATE_LIMIT_TEST_GUIDE.md)**

### Quick tests:

**Teste 1: Mensagem longa**
```javascript
// No console do browser (F12)
fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    message: 'A'.repeat(2001), // 2001 caracteres
    conversationHistory: []
  })
}).then(r => r.json()).then(console.log)
// Esperado: { error: "Mensagem muito longa", message: "..." }
```

**Teste 2: Rate limit**
```javascript
// Enviar 11 requests rápidas
for (let i = 1; i <= 11; i++) {
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ message: `Teste ${i}`, conversationHistory: [] })
  }).then(r => console.log(`Request ${i}: ${r.status}`))
}
// Esperado: 10x "200", 1x "429"
```

**Teste 3: Verificar tokens registrados**
```sql
SELECT user_id, day_count, day_tokens_used 
FROM public.rate_limits;
```

---

## 📈 Custos Estimados

### Sem rate limit (antes):
- 💸 **Custo:** Ilimitado (vulnerável a abuso)
- 🚨 **Risco:** Bot pode custar $1000+ em um dia

### Com rate limit (agora):
- 💰 **Custo máximo por usuário/dia:** ~$0.30-1.50 (100k tokens)
- 📊 **Custo máximo com 100 usuários ativos:** ~$30-150/dia = $900-4500/mês
- ✅ **Risco controlado:** Custo previsível e escalável

**Ajustar limites conforme tier do usuário:**
- Free: 50k tokens/dia (~$0.15-0.75)
- Pro: 200k tokens/dia (~$0.60-3.00)
- Enterprise: Custom

---

## 🔧 Ajustar Limites

### Backend (lib/rate-limit.ts):

```typescript
const LIMITS = {
  REQUESTS_PER_MINUTE: 10,    // ← Editar aqui
  REQUESTS_PER_DAY: 200,      // ← Editar aqui
  TOKENS_PER_DAY: 100_000,    // ← Editar aqui (custo ~$0.30-0.75)
}
```

### Frontend (app/api/chat/route.ts):

```typescript
const MAX_MESSAGE_LENGTH = 2000      // ← Editar aqui
const MAX_MESSAGES_IN_CONTEXT = 50   // ← Editar aqui
```

**Após editar:** Reiniciar servidor Next.js (`npm run dev`)

---

## 🐛 Troubleshooting

### Erro: "Service role key is required"

**Causa:** `SUPABASE_SERVICE_ROLE_KEY` não está em `.env.local`

**Solução:**
1. Ir em Supabase Dashboard → Settings → API
2. Copiar chave `service_role` (secret)
3. Adicionar em `.env.local`:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...
   ```
4. Reiniciar servidor

### Rate limit não está funcionando

**Debug:**
1. Migration aplicada? `SELECT * FROM rate_limits;`
2. Logs mostram erro? (ver terminal do `npm run dev`)
3. Service role key configurada?

**Force reset de um usuário:**
```sql
UPDATE public.rate_limits
SET minute_count = 0, day_count = 0, day_tokens_used = 0
WHERE user_id = 'USER_ID';
```

### Frontend não mostra erro amigável

**Verificar:**
1. Browser cache? (Ctrl+Shift+R para hard refresh)
2. Build do Next.js? (`npm run build` e `npm start`)
3. Console do browser tem erros JS?

---

## ✅ Checklist de Deploy

Antes de fazer deploy para produção:

- [ ] Migration 018 aplicada no Supabase production
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada no Vercel/servidor
- [ ] Testado localmente (todos os 5 testes do guia)
- [ ] Limites ajustados conforme estratégia de pricing
- [ ] Monitoramento de custos configurado (Anthropic dashboard)
- [ ] Alertas de uso configurados (opcional)

---

## 🚀 Próximos Passos (Roadmap)

### P2 - Melhorias de UX:
- [ ] Indicador visual de "X/200 mensagens usadas hoje"
- [ ] Warning quando chegar em 80% do limite diário
- [ ] Toast notification em vez de mensagem no chat

### P2 - Analytics:
- [ ] Dashboard admin de uso (quem usa mais, quando)
- [ ] Gráfico de tokens consumidos por dia/semana
- [ ] Alertas de abuso (usuários que sempre batem no limite)

### P3 - Performance:
- [ ] Cache de rate limit em Redis (reduzir latência)
- [ ] Rate limit em edge middleware (bloquear antes do route handler)

### P3 - Escalabilidade:
- [ ] Limites por tier (free/pro/enterprise)
- [ ] Override de limites para usuários específicos
- [ ] Billing integrado (cobrar por uso acima do limite)

---

## 📝 Notas Técnicas

### Por que não usar Redis/Upstash?

**Pros do Redis:**
- Mais rápido (~10ms vs ~50ms do Supabase)
- Menos queries ao banco principal

**Contras do Redis:**
- Custo adicional (mais um serviço)
- Complexidade (mais dependências)
- Dados não persistem se Redis cair

**Decisão:** Supabase é suficiente para MVP. Migrar para Redis se necessário (>1000 usuários ativos).

### Por que não usar middleware do Next.js?

**Tentamos** implementar rate limit no `middleware.ts`, mas:
- Middleware não tem acesso ao Supabase service role (apenas anon)
- Edge runtime não suporta algumas libs do Supabase
- Mais complexo debugar

**Decisão:** Implementar no route handler é mais simples e funciona bem.

### Por que fail open em vez de fail closed?

**Fail open** = permitir em caso de erro  
**Fail closed** = bloquear em caso de erro

**Razão:** UX > Segurança neste caso. Melhor ter rate limit funcionando 99% do tempo do que bloquear todos os usuários quando o Supabase tiver um hiccup.

---

## 📞 Suporte

Dúvidas ou problemas? Consultar:
1. [RATE_LIMIT_TEST_GUIDE.md](./RATE_LIMIT_TEST_GUIDE.md) — Guia de testes
2. Logs do servidor (`npm run dev`) — Procurar por `[Rate Limit]`
3. Supabase logs (Dashboard → Logs → API)
4. Anthropic usage (Dashboard → Usage)

---

**Implementado em:** 2026-02-07  
**Versão:** 1.0  
**Status:** ✅ Pronto para teste e deploy
