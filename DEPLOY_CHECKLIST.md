# 🚀 Deploy Checklist - Rate Limit + Supply Chain

## ✅ Commits Criados (Prontos para Push)

3 commits foram criados localmente:

```bash
git log --oneline -3
```

Resultado:
- `3c142fb` docs: update progress tracking and testing guides
- `8776d96` feat(chat): add rate limiting and message size validation
- `b8b3d9d` feat(supply-chain): add supply chain intelligence analytics

---

## 📤 Passo 1: Push para GitHub

```bash
git push origin main
```

Isso vai disparar deploy automático no Vercel.

---

## 🔐 Passo 2: Configurar Supabase Production (CRÍTICO!)

### 2.1 Aplicar Migration 018 (Rate Limits)

1. Acesse: https://supabase.com/dashboard
2. Selecione o projeto **Profeta** (produção)
3. Vá em **SQL Editor** (menu lateral)
4. Clique em **New Query**
5. Cole o conteúdo abaixo:

```sql
-- Migration: 018_rate_limits.sql
-- Rate limiting table for chat API abuse prevention

DROP TABLE IF EXISTS public.rate_limits CASCADE;

CREATE TABLE public.rate_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Contadores de janela por minuto
  minute_count INTEGER DEFAULT 0,
  minute_window TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contadores de janela diária
  day_count INTEGER DEFAULT 0,
  day_tokens_used INTEGER DEFAULT 0,
  day_window DATE DEFAULT CURRENT_DATE,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único por user (garante um registro por usuário)
CREATE UNIQUE INDEX idx_rate_limits_user ON public.rate_limits(user_id);

-- RLS: apenas service_role pode acessar (não expor ao client)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy que bloqueia acesso de qualquer role que não seja service_role
CREATE POLICY "Service role only" ON public.rate_limits
  USING (false)
  WITH CHECK (false);

-- Comentários para documentação
COMMENT ON TABLE public.rate_limits IS 'Rate limiting counters per user for chat API abuse prevention';
COMMENT ON COLUMN public.rate_limits.minute_count IS 'Number of requests in current minute window';
COMMENT ON COLUMN public.rate_limits.minute_window IS 'Start timestamp of current minute window';
COMMENT ON COLUMN public.rate_limits.day_count IS 'Number of requests in current day';
COMMENT ON COLUMN public.rate_limits.day_tokens_used IS 'Total tokens consumed in current day';
COMMENT ON COLUMN public.rate_limits.day_window IS 'Current day (YYYY-MM-DD) for daily counters';
```

6. Clique em **Run** (ou Ctrl+Enter)
7. Verificar sucesso:

```sql
-- Verificar que a tabela foi criada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rate_limits' 
  AND table_schema = 'public';
```

Deve retornar 8 colunas.

### 2.2 Aplicar Migration 017 (Supply Chain) - OPCIONAL

Se ainda não aplicou a migration 017 em produção:

```sql
-- Migration: 017_supply_chain_fields.sql
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS supplier_reliability_score DECIMAL(3,2) DEFAULT 1.0;

COMMENT ON COLUMN public.products.lead_time_days IS 'Supplier lead time in days';
COMMENT ON COLUMN public.products.min_order_quantity IS 'Minimum order quantity (MOQ)';
COMMENT ON COLUMN public.products.supplier_reliability_score IS 'Supplier reliability score (0.0-1.0)';
```

---

## 🔑 Passo 3: Adicionar Environment Variable no Vercel (CRÍTICO!)

### 3.1 Obter Service Role Key do Supabase

1. No Supabase Dashboard do projeto de produção
2. Vá em **Settings** → **API**
3. Na seção **Project API keys**, copie a chave **`service_role`** (secret)
   - ⚠️ **NÃO** é a `anon` key
   - ⚠️ Esta chave é **secreta** - nunca commitar no git

### 3.2 Adicionar no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **Profeta**
3. Vá em **Settings** → **Environment Variables**
4. Clique em **Add New**
5. Preencha:
   - **Key:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** (cole a service role key copiada)
   - **Environment:** Selecione **Production**, **Preview**, e **Development**
6. Clique em **Save**

### 3.3 Redeploy (Necessário!)

Após adicionar a variável, você precisa fazer redeploy para ela ser aplicada:

1. No Vercel, vá em **Deployments**
2. Clique nos **três pontinhos** do último deployment
3. Clique em **Redeploy**
4. Aguarde o deploy terminar (~2 minutos)

---

## ✅ Passo 4: Verificar Deploy

### 4.1 Verificar que o deploy passou

No Vercel:
- Status do deployment: **Ready** ✅
- Build logs não mostram erros

### 4.2 Testar Rate Limit em Produção

1. Acesse seu site em produção (URL do Vercel)
2. Abra o console do browser (F12)
3. Execute:

```javascript
// Testar mensagem longa (413)
fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    message: 'A'.repeat(2001),
    conversationHistory: []
  })
}).then(r => r.json()).then(console.log)
// Esperado: { error: "Mensagem muito longa", ... }

// Testar rate limit (429) - enviar 11 mensagens
async function test() {
  for (let i = 1; i <= 11; i++) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message: 'Oi', conversationHistory: [] })
    });
    console.log(`Request ${i}: ${res.status}`);
    if (res.status === 429) {
      console.log('✅ Rate limit funcionando!');
      break;
    }
    await new Promise(r => setTimeout(r, 100));
  }
}
test();
```

**Esperado:**
- Primeiras 10 mensagens: Status 200
- 11ª mensagem: Status 429

### 4.3 Verificar Logs do Vercel

1. No Vercel, vá em **Logs** (ou **Runtime Logs**)
2. Procure por erros:
   - ❌ `[Rate Limit] Failed to check rate limit` → Service role key não configurada ou migration não aplicada
   - ❌ `Could not find the table 'public.rate_limits'` → Migration 018 não foi aplicada
   - ✅ Sem erros → Tudo funcionando!

---

## 🚨 Troubleshooting

### Erro: "Could not find table 'rate_limits'"

**Causa:** Migration 018 não foi aplicada no Supabase de produção.

**Solução:**
1. Volte ao Passo 2.1
2. Execute o SQL da migration 018 no SQL Editor do Supabase
3. Aguarde 30 segundos para o schema cache recarregar
4. Teste novamente

### Erro: "Service role key is required"

**Causa:** `SUPABASE_SERVICE_ROLE_KEY` não está configurada no Vercel.

**Solução:**
1. Volte ao Passo 3
2. Adicione a variável no Vercel
3. **Redeploy obrigatório** após adicionar variável
4. Aguarde deploy terminar
5. Teste novamente

### Rate Limit não está bloqueando

**Debug:**

1. Verificar que a migration foi aplicada:
```sql
SELECT * FROM public.rate_limits;
```

2. Verificar que a variável está configurada:
```bash
# No terminal local (para comparar)
echo $SUPABASE_SERVICE_ROLE_KEY
```

3. Verificar logs do Vercel (Runtime Logs) durante uma request

### Fail Open Ativo (Permite Requests Mesmo com Erro)

Se você ver nos logs:

```
[Rate Limit] Failed to check rate limit: ...
POST /api/chat 200 in 5000ms
```

Isso significa que o rate limit **falhou mas permitiu a request** (fail open). Isso é intencional para não bloquear usuários por erro de sistema, mas indica que algo está errado:

- Migration não aplicada → Aplicar migration 018
- Service role key incorreta → Verificar key no Vercel
- Supabase instável → Verificar Supabase status

---

## 📊 Monitoramento Pós-Deploy

### Verificar uso no Supabase

```sql
-- Ver todos os usuários e contadores
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

-- Usuários próximos do limite
SELECT 
  user_id,
  day_count,
  day_tokens_used,
  ROUND((day_tokens_used::float / 100000.0 * 100)::numeric, 2) AS percent_tokens_used
FROM public.rate_limits
WHERE day_window = CURRENT_DATE
  AND (day_count >= 180 OR day_tokens_used >= 90000)
ORDER BY day_count DESC;
```

### Verificar custos no Anthropic

1. Acesse: https://console.anthropic.com
2. Vá em **Usage**
3. Verifique que o custo diário está controlado
4. Com rate limit: Máximo ~$30-150/dia (depende do número de usuários)

---

## ✅ Checklist Final

Antes de considerar completo:

- [ ] Push realizado (`git push origin main`)
- [ ] Deploy automático do Vercel completou (status: Ready)
- [ ] Migration 018 aplicada no Supabase de produção
- [ ] Tabela `rate_limits` existe e tem 8 colunas
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada no Vercel
- [ ] Redeploy feito após adicionar variável
- [ ] Teste de mensagem longa (413) funcionando em produção
- [ ] Teste de rate limit (429) funcionando em produção
- [ ] Logs do Vercel sem erros de rate limit
- [ ] (Opcional) Migration 017 aplicada para supply chain

---

## 📝 Notas

### Custos Esperados

**Antes do rate limit:**
- 💸 Custo ilimitado (vulnerável a abuso)
- 🚨 Bot pode gastar $1000+ em um dia

**Agora com rate limit:**
- 💰 Máximo $0.30-1.50 por usuário/dia (100k tokens)
- 📊 Com 100 usuários: ~$30-150/dia = $900-4500/mês
- ✅ Custo controlado e previsível

### Ajustar Limites

Se quiser ajustar limites após deploy, edite `lib/rate-limit.ts`:

```typescript
const LIMITS = {
  REQUESTS_PER_MINUTE: 10,    // ← Editar aqui
  REQUESTS_PER_DAY: 200,      // ← Editar aqui
  TOKENS_PER_DAY: 100_000,    // ← Editar aqui
}
```

Commit, push, e aguarde redeploy automático do Vercel.

---

## 🎉 Deploy Completo!

Após completar todos os passos:
- ✅ Rate limit protegendo custos
- ✅ Supply chain analytics disponível
- ✅ Sistema em produção
- ✅ Monitoramento ativo

**Status:** Pronto para uso! 🚀
