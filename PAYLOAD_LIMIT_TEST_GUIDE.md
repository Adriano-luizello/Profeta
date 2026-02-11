# Guia de Teste — Limite de Payload (P2 #11)

## O que foi implementado

**Validação de tamanho de arquivo em 3 camadas** para prevenir abuso/acidentes no upload de CSV:

1. **Frontend (Pre-upload)**: Validação antes de processar o arquivo
2. **Frontend (Post-save)**: Tratamento de erro 413 do backend
3. **Backend**: Validação de Content-Length e body size

---

## Limites configurados

### Hard Limits (BLOQUEIAM)
- **Tamanho máximo**: 50 MB
- **Tipo de arquivo**: Apenas `.csv`

### Warning Limits (AVISAM, mas deixam continuar)
- **Tamanho de arquivo**: > 10 MB
- **Número de linhas**: > 50.000 linhas

---

## Arquivos modificados

1. **`lib/upload-limits.ts`** (novo)
   - Constantes centralizadas (`MAX_FILE_SIZE_MB`, `WARNING_FILE_SIZE_MB`, etc.)
   - Helper functions: `formatFileSize()`, `estimateProducts()`

2. **`app/dashboard/upload/page.tsx`**
   - Import de constantes e helpers
   - State para warnings (`warningMessage`, `pendingFile`)
   - Função `handleFileUpload()` atualizada com 4 validações:
     1. Hard limit de tamanho (50MB)
     2. Tipo de arquivo (.csv)
     3. Warning de tamanho (10MB)
     4. Warning de número de linhas (50k)
   - Nova função `processFile()` (extraída da anterior)
   - UI de warning com botões "Continuar" e "Cancelar"
   - Tratamento de erro 413 no `handleSave()`
   - Texto "Tamanho máximo" atualizado (10MB → 50MB)

3. **`app/api/analyses/route.ts`**
   - Import de `UPLOAD_LIMITS`
   - Validação 1: Content-Length header (< 50MB)
   - Validação 2: Dados obrigatórios (fileName, csvData)
   - Validação 3: Tamanho do body JSON (double-check)
   - Resposta estruturada 413 com campo `max_size_mb`

---

## Como testar

### Teste 1: Arquivo válido pequeno (< 10 MB)

**Ação**: Upload de arquivo CSV normal (~1-5 MB)

**Resultado esperado**:
- ✅ Upload procede normalmente
- ✅ Sem warnings ou erros
- ✅ Mensagem "Tamanho máximo: 50 MB" visível na UI

---

### Teste 2: Arquivo grande com warning (10-50 MB)

**Ação**: Upload de arquivo CSV entre 10-50 MB

**Preparação (criar arquivo de teste)**:
```bash
# Criar um CSV de ~15MB (ajustar número de linhas)
head -1 profeta-test-10products.csv > large-test.csv
for i in {1..100000}; do tail -1 profeta-test-10products.csv >> large-test.csv; done
```

**Resultado esperado**:
- ⚠️ Alert de warning aparece:
  - "⚠️ Arquivo grande (X MB). O processamento pode levar alguns minutos. Deseja continuar?"
  - Mostra nome do arquivo e tamanho
  - Botões "Continuar" e "Cancelar"
- ✅ Clicar "Continuar" → Upload procede
- ✅ Clicar "Cancelar" → Volta para upload

---

### Teste 3: Arquivo muito grande - BLOQUEADO (> 50 MB)

**Ação**: Upload de arquivo CSV > 50 MB

**Resultado esperado**:
- 🔴 Erro aparece IMEDIATAMENTE:
  - "Arquivo muito grande (X MB). Máximo permitido: 50 MB. Reduza o tamanho do arquivo ou divida em partes menores."
- ❌ Upload NÃO procede
- ✅ Botão de upload continua disponível

---

### Teste 4: Arquivo não-CSV - BLOQUEADO

**Ação**: Upload de arquivo `.xlsx`, `.txt`, ou `.json`

**Resultado esperado**:
- 🔴 Erro aparece:
  - "Formato inválido. Envie um arquivo .csv (arquivo atual: exemplo.xlsx)"
- ❌ Upload NÃO procede

---

### Teste 5: Muitas linhas (> 50k linhas)

**Ação**: Upload de CSV com mais de 50.000 linhas

**Resultado esperado**:
- ⚠️ Alert de warning aparece:
  - "⚠️ Arquivo com 65.432 linhas (~654 produtos estimados). O processamento pode demorar. Deseja continuar?"
  - Mostra nome do arquivo e tamanho
  - Botões "Continuar" e "Cancelar"
- ✅ Clicar "Continuar" → Upload procede
- ✅ Clicar "Cancelar" → Volta para upload

---

### Teste 6: Validação backend (bypass frontend)

**Ação**: Fazer POST direto para `/api/analyses` com payload > 50MB usando curl/Postman

**Comando de teste**:
```bash
# Criar payload grande
node -e "console.log(JSON.stringify({fileName:'test.csv',csvData:Array(100000).fill({date:'2024-01-01',product:'Test',quantity:1,price:100})}))" > large-payload.json

# Fazer POST
curl -X POST http://localhost:3000/api/analyses \
  -H "Content-Type: application/json" \
  -d @large-payload.json
```

**Resultado esperado**:
- 🔴 Status: 413 Payload Too Large
- 🔴 Resposta:
  ```json
  {
    "error": "PAYLOAD_TOO_LARGE",
    "message": "Arquivo excede o limite de 50 MB. Reduza o tamanho do arquivo ou divida em partes menores.",
    "max_size_mb": 50
  }
  ```

---

## Checklist de validação

### Frontend
- [ ] Arquivo < 10MB → Upload normal sem warnings
- [ ] Arquivo 10-50MB → Warning aparece, pode continuar
- [ ] Arquivo > 50MB → Erro BLOQUEIA upload
- [ ] Arquivo .xlsx/.txt → Erro BLOQUEIA upload
- [ ] Arquivo com 60k linhas → Warning aparece, pode continuar
- [ ] Botões "Continuar" e "Cancelar" funcionam
- [ ] Mensagem de erro 413 é tratada no handleSave()
- [ ] Texto "Tamanho máximo: 50 MB" aparece na UI

### Backend
- [ ] Content-Length > 50MB → 413 BLOQUEADO
- [ ] Body JSON > 50MB → 413 BLOQUEADO
- [ ] Resposta 413 tem estrutura correta (error, message, max_size_mb)
- [ ] Arquivo válido < 50MB → 200 OK

### Constantes
- [ ] `UPLOAD_LIMITS.MAX_FILE_SIZE_MB` = 50
- [ ] `UPLOAD_LIMITS.WARNING_FILE_SIZE_MB` = 10
- [ ] `UPLOAD_LIMITS.WARNING_ROWS` = 50000
- [ ] `formatFileSize()` formata corretamente (B, KB, MB)
- [ ] `estimateProducts()` estima corretamente (~100 linhas/produto)

---

## Cenários reais de uso

### Cenário 1: Catálogo pequeno (100 produtos)
- 100 produtos × 24 meses = 2.400 linhas
- Tamanho estimado: ~200 KB
- ✅ Sem warnings, upload rápido

### Cenário 2: Catálogo médio (500 produtos)
- 500 produtos × 24 meses = 12.000 linhas
- Tamanho estimado: ~1 MB
- ✅ Sem warnings, upload normal

### Cenário 3: Catálogo grande (1000 produtos × 2 anos)
- 1000 produtos × 24 meses = 24.000 linhas
- Tamanho estimado: ~2 MB
- ✅ Sem warnings, upload normal

### Cenário 4: Catálogo muito grande (2000 produtos × 3 anos)
- 2000 produtos × 36 meses = 72.000 linhas
- Tamanho estimado: ~6 MB
- ⚠️ Warning de linhas (> 50k), pode continuar

### Cenário 5: Base completa de e-commerce (5000 produtos × 5 anos)
- 5000 produtos × 60 meses = 300.000 linhas
- Tamanho estimado: ~25 MB
- ⚠️ Warnings de tamanho + linhas, mas permitido
- ⏱️ Processamento ~15-20 minutos

### Cenário 6: Arquivo absurdo (10000 produtos × 10 anos)
- 10000 produtos × 120 meses = 1.200.000 linhas
- Tamanho estimado: ~100 MB
- 🔴 BLOQUEADO (> 50MB)
- 💡 Sugestão: Dividir em períodos (ex: 2 uploads de 5 anos cada)

---

## Notas importantes

1. **Limites são por segurança, não restrição**:
   - 50MB é suficiente para ~5.000 produtos com 5 anos de histórico
   - Bloqueio previne acidentes (ex: CSV de 500MB) ou abuso

2. **Warnings não bloqueiam**:
   - Usuário decide se quer continuar
   - Transparência sobre tempo de processamento

3. **Backend é última linha de defesa**:
   - Se alguém burlar validação frontend (curl, Postman)
   - Backend garante que payload não estoura

4. **Mensagens em português**:
   - Claras e acionáveis
   - Explicam o problema e como resolver

5. **Constantes centralizadas**:
   - Fácil ajustar limites no futuro
   - Frontend e backend sincronizados

---

## Status

✅ **IMPLEMENTADO e BUILD PASSOU**
- Frontend: Validações + warnings + UI
- Backend: Validação de payload + erro 413
- Constantes: Centralizadas e reutilizáveis

**Pronto para teste e push!** 🚀
