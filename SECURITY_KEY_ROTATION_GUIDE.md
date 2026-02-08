# 🔐 SECURITY: Service Role Key Rotation Guide

**Status:** 🚨 AÇÃO IMEDIATA NECESSÁRIA  
**Motivo:** Service Role Key foi exposta em conversação do AI assistant  
**Data:** 2026-02-08

---

## 🎯 Resumo Executivo

A `SUPABASE_SERVICE_ROLE_KEY` foi exposta e precisa ser rotacionada **imediatamente**. Este guia lista todos os locais onde a nova chave precisa ser atualizada após rotação.

---

## ✅ Verificação de Segurança Atual

### Arquivos com Chave Real (OK - ignorados pelo Git):
- ✅ `.env.local` (root) — **ignorado** por `.gitignore`
- ✅ `profeta-forecaster/.env` — **ignorado** por `.gitignore`

### Arquivos de Exemplo (Limpados):
- ✅ `env.example` — **limpo** (apenas placeholder)
- ✅ `profeta-forecaster/env.example.txt` — **limpo** (apenas placeholder)

### Documentação (Limpada):
- ✅ `PRODUCTION_VALIDATION_CHECKLIST.md` — **limpo**
- ✅ `RATE_LIMIT_IMPLEMENTATION_SUMMARY.md` — **limpo**
- ✅ `RATE_LIMIT_TEST_GUIDE.md` — **limpo**
- ✅ `SUPABASE_SETUP.md` — **limpo**

### Status no Git:
- ✅ Nenhuma chave real está commitada no repositório
- ✅ `.gitignore` protege arquivos `.env*`
- ⚠️ Histórico do Git não contém a chave (verificado)

---

## 🔄 Procedimento de Rotação (Passo a Passo)

### 1. Gerar Nova Service Role Key no Supabase

**Acesse:**
1. Abrir Supabase Dashboard: https://supabase.com/dashboard
2. Selecionar projeto: **Profeta** (`hkrbqmdigjonqrgofgms`)
3. Navegar: **Settings** → **API**
4. Na seção **Project API keys**, encontrar **service_role**
5. Clicar em **Reset** ao lado da service_role key
6. **⚠️ IMPORTANTE:** Copiar a nova chave IMEDIATAMENTE (não será mostrada novamente)

**Screenshot esperado:**
```
Project API keys
┌─────────────────────────────────────────┐
│ service_role  [Reset] [Copy] [Hidden]  │
│ This key has the ability to bypass     │
│ Row Level Security. Keep it secret!    │
└─────────────────────────────────────────┘
```

### 2. Atualizar Localmente (Desenvolvimento)

**Arquivos a atualizar:**

#### 2.1. `.env.local` (root do projeto)
```bash
# Localização: /Users/adrianoluizello/Profeta/.env.local
# Linha 4:
SUPABASE_SERVICE_ROLE_KEY=<NOVA_CHAVE_AQUI>
```

#### 2.2. `profeta-forecaster/.env` (Python API)
```bash
# Localização: /Users/adrianoluizello/Profeta/profeta-forecaster/.env
# Linha 4:
SUPABASE_SERVICE_ROLE_KEY=<NOVA_CHAVE_AQUI>
```

**Após atualizar:**
```bash
# Reiniciar servidores:

# Terminal 1 - Next.js
npm run dev

# Terminal 2 - Python Forecaster
cd profeta-forecaster
uvicorn main:app --reload --port 8000
```

### 3. Atualizar Vercel (Produção Frontend)

**Acesse:**
1. Vercel Dashboard: https://vercel.com/dashboard
2. Selecionar projeto: **profeta-analytics**
3. Navegar: **Settings** → **Environment Variables**
4. Encontrar `SUPABASE_SERVICE_ROLE_KEY`
5. Clicar em **Edit** (ícone de lápis)
6. Colar a nova chave
7. Clicar em **Save**
8. **⚠️ IMPORTANTE:** Fazer **Redeploy** para aplicar:
   - Ir para **Deployments** tab
   - Clicar nos 3 pontos no último deploy
   - Selecionar **Redeploy**

**Scopes da variável:**
- ✅ Production
- ✅ Preview
- ✅ Development

### 4. Atualizar Render (Produção Python API - se aplicável)

**Se o Python forecaster estiver hospedado no Render:**

1. Render Dashboard: https://dashboard.render.com
2. Selecionar serviço do Profeta Forecaster
3. Navegar: **Environment** tab
4. Encontrar `SUPABASE_SERVICE_ROLE_KEY`
5. Clicar em **Edit**
6. Colar a nova chave
7. Clicar em **Save**
8. **Auto-deploy** será triggerado automaticamente

**Nota:** Se o Python API não estiver no Render, ignorar este passo.

---

## ✅ Validação Pós-Rotação

### Checklist de Validação:

#### 1. Local (Dev)
- [ ] Next.js inicia sem erros (`npm run dev`)
- [ ] Python API inicia sem erros (`uvicorn main:app`)
- [ ] Upload de CSV funciona
- [ ] Dashboard mostra dados
- [ ] Chat funciona e aplica rate limiting (10 msgs/min)

**Comando de teste:**
```bash
# Testar chat API com rate limiting:
for i in {1..11}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    http://localhost:3001/api/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"teste"}' &
done
wait

# Esperado: 10x status 200, 1x status 429
```

#### 2. Vercel (Produção)
- [ ] Deploy completou com sucesso
- [ ] App carrega em https://profeta-analytics.vercel.app
- [ ] Upload de CSV funciona
- [ ] Dashboard mostra dados
- [ ] Chat funciona e aplica rate limiting

**Comando de teste:**
```bash
# Testar em produção:
curl -I https://profeta-analytics.vercel.app/api/chat
# Esperado: HTTP 401 (sem auth) ou 200 (com auth válida)
```

#### 3. Render (Produção Python - se aplicável)
- [ ] Deploy completou com sucesso
- [ ] Health check passa
- [ ] Forecaster API responde

**Comando de teste:**
```bash
# Testar Python API:
curl https://your-forecaster.onrender.com/health
# Esperado: {"status": "healthy"}
```

---

## 🚨 Troubleshooting

### Erro: "Invalid API key" após rotação

**Sintoma:**
```
supabase.exceptions.APIError: Invalid API key
```

**Causa:** Nova chave não foi aplicada ou formato incorreto

**Fix:**
1. Verificar que a chave foi copiada completamente (começa com `eyJh...`)
2. Verificar que não há espaços antes/depois da chave
3. Verificar que o arquivo `.env` foi salvo
4. Reiniciar os servidores

### Erro: Rate limiting não funciona

**Sintoma:** Chat aceita mais de 10 mensagens sem bloquear

**Causa:** Service role key não está sendo usada no backend

**Fix:**
```bash
# Verificar que a variável está definida:
echo $SUPABASE_SERVICE_ROLE_KEY  # deve mostrar a chave

# Verificar no código que está usando createServiceRoleClient():
grep -r "createServiceRoleClient" app/api/
```

### Vercel não aplicou a nova chave

**Sintoma:** Produção continua com erro "Invalid API key"

**Causa:** Env var foi atualizada mas não redeployed

**Fix:**
1. Forçar redeploy no Vercel Dashboard
2. OU fazer push de um commit trivial (trigger deploy)

---

## 📋 Resumo de Locais a Atualizar

| Local | Arquivo/Dashboard | Ação | Restart Necessário |
|-------|-------------------|------|-------------------|
| **Dev - Next.js** | `.env.local` linha 4 | Atualizar chave | ✅ Sim (`npm run dev`) |
| **Dev - Python** | `profeta-forecaster/.env` linha 4 | Atualizar chave | ✅ Sim (`uvicorn`) |
| **Prod - Vercel** | Settings → Env Vars | Edit + Redeploy | ✅ Redeploy |
| **Prod - Render** | Environment tab | Edit (auto-deploy) | ⚠️ Automático |

---

## 🔒 Boas Práticas de Segurança

### ✅ O QUE FAZER:
- Manter `.env*` sempre no `.gitignore`
- Usar placeholders em arquivos `.example`
- Rotacionar chaves imediatamente se expostas
- Usar service role APENAS no backend (nunca no frontend)
- Monitorar logs do Supabase para atividade suspeita

### ❌ O QUE EVITAR:
- Nunca commitar `.env` com chaves reais
- Nunca compartilhar chaves em chat/Slack/email
- Nunca usar service role no código do cliente (browser)
- Nunca logar chaves completas (mascarar com `***`)
- Nunca expor env vars em error messages públicos

---

## 📊 Impacto da Rotação

### ⚠️ Downtime Esperado:
- **Local:** 0s (só reiniciar servidores)
- **Vercel:** ~10-30s (tempo de redeploy)
- **Render:** ~30-60s (tempo de redeploy automático)

### ✅ Sem Impacto em:
- Dados no Supabase (nenhum dado é perdido)
- Usuários autenticados (anon key não muda)
- Forecasts salvos
- Análises existentes

### ⚠️ Impacto Temporário em:
- Rate limiting pode resetar contadores (aceitável)
- Uploads em progresso podem falhar (retry resolve)

---

## 🎯 Checklist Final

Após completar todos os passos acima:

- [ ] Nova chave gerada no Supabase
- [ ] `.env.local` atualizado (root)
- [ ] `profeta-forecaster/.env` atualizado
- [ ] Vercel env vars atualizadas
- [ ] Vercel redeployed
- [ ] Render env vars atualizadas (se aplicável)
- [ ] Testes locais passando
- [ ] Testes em produção passando
- [ ] Rate limiting funcionando
- [ ] Nenhum erro nos logs
- [ ] Documentação limpa (sem chaves expostas)

---

**✅ SE TODOS OS ITENS ACIMA ESTIVEREM MARCADOS: ROTAÇÃO COMPLETA!**

---

## 📞 Suporte

Se encontrar problemas durante a rotação:

1. Verificar logs do Vercel: Functions → Realtime logs
2. Verificar logs do Supabase: Logs → API
3. Testar conexão: `npm run test` (se houver)
4. Verificar status: https://status.supabase.com

---

**Última atualização:** 2026-02-08  
**Próxima rotação sugerida:** A cada 90 dias ou se exposta
