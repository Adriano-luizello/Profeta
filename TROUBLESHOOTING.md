# 🔧 Troubleshooting Guide - Profeta

## ❌ 404 em todas as rotas + EMFILE (too many open files)

### Sintoma
- Todas as URLs retornam 404 (inclusive `/` e `/dashboard`)
- Terminal mostra: `Watchpack Error (watcher): Error: EMFILE: too many open files`

### Causa
Limite de arquivos abertos do macOS está sendo excedido. O Next.js não consegue observar os arquivos e compila incorretamente.

### ✅ Solução

**1. Pare todos os servidores** (Ctrl+C nos terminais com `npm run dev`)

**2. Aumente o limite e limpe o cache:**
```bash
cd /Users/adrianoluizello/Profeta
ulimit -n 10240
rm -rf .next
npm run dev
```

**3. Se o EMFILE persistir**, o `package.json` já usa `WATCHPACK_POLLING=true` no `dev:next`, o que reduz o uso de file descriptors.

**4. Tente a porta correta:** O Next.js pode estar em 3000 ou 3001. Verifique no terminal qual porta foi usada e acesse `http://127.0.0.1:3000` ou `http://127.0.0.1:3001`.

---

## ❌ Erro: NotAllowedError no Upload de CSV

### Descrição do Erro
```
NotAllowedError: Failed to execute 'getFile' on 'FileSystemFileHandle': 
The request is not allowed by the user agent or the platform in the current context.
```

### Causa
Este erro ocorre quando o navegador bloqueia o acesso ao arquivo por questões de segurança/permissões.

### ✅ Soluções Implementadas

#### 1. Configuração Simplificada do Dropzone
- Removidas restrições de accept que causavam conflito
- Mantida apenas validação manual de extensão .csv
- Adicionado input file alternativo

#### 2. Input File Alternativo
Na página de upload, agora há um link abaixo da área de drag & drop:
```
"Ou clique aqui para selecionar um arquivo"
```

Use este método se o drag & drop não funcionar.

---

## 🧪 Como Testar Agora

### Método 1: Drag & Drop (Preferencial)
1. Acesse: http://localhost:3001/dashboard/upload
2. Arraste o arquivo `test-data/sample_sales.csv` para a área
3. Solte o arquivo

### Método 2: Click to Upload (Fallback)
1. Acesse: http://localhost:3001/dashboard/upload
2. Clique no link "Ou clique aqui para selecionar um arquivo"
3. Selecione `test-data/sample_sales.csv` no seletor de arquivos
4. Confirme

### Método 3: Copiar Arquivo para Desktop
Se ainda tiver problemas:
```bash
# Copie o arquivo de teste para o Desktop
cp test-data/sample_sales.csv ~/Desktop/

# Depois faça upload do arquivo do Desktop
```

---

## 🌐 Compatibilidade de Navegadores

### ✅ Testado e Funcionando
- Chrome/Edge (versões recentes)
- Firefox (versões recentes)
- Safari (versões recentes)

### ⚠️ Possíveis Problemas
- **Navegadores muito antigos**: Atualize para a versão mais recente
- **Modo privado/anônimo**: Alguns navegadores restringem acesso a arquivos
- **Extensões de segurança**: Podem bloquear FileSystem API

---

## 🔍 Outros Problemas Comuns

### Upload não funciona de jeito nenhum

**Solução**: Verifique o console do navegador (F12) para erros específicos.

### Validação falha mesmo com arquivo correto

**Verifique**:
- Arquivo tem extensão `.csv`
- Arquivo tem cabeçalho com: `date,product,quantity,price`
- Valores estão corretos (datas válidas, números positivos)
- Não há linhas completamente vazias no meio do arquivo

### Erro 401 (Não autorizado) ao salvar

**Solução**: 
- Faça logout e login novamente
- Limpe os cookies do navegador
- Verifique se o Supabase está conectado

### Erro 500 (Erro do servidor)

**Verifique**:
1. Servidor está rodando (`npm run dev`)
2. `.env.local` existe e tem as credenciais corretas
3. Supabase está online (verifique o dashboard)

---

## 🛠️ Comandos Úteis

### Reiniciar Servidor
```bash
cd /Users/adrianoluizello/Profeta
npm run dev
```

### Limpar Cache e Reiniciar
```bash
rm -rf .next
npm run dev
```

### Ver Logs do Servidor
Os logs aparecem no terminal onde você rodou `npm run dev`

### Verificar Banco de Dados
Acesse: https://supabase.com/dashboard/project/hkrbqmdigjonqrgofgms

---

## 📞 Debug Mode

Se precisar de mais informações de debug, abra o console do navegador (F12) e:

1. Vá para a aba "Console"
2. Tente fazer o upload
3. Veja os erros/avisos que aparecem
4. Compartilhe comigo para análise

---

## ✅ Checklist de Solução de Problemas

Antes de reportar um problema, verifique:

- [ ] Servidor está rodando (`npm run dev`)
- [ ] Navegador está atualizado
- [ ] JavaScript está habilitado
- [ ] Não está em modo anônimo/privado
- [ ] Arquivo CSV está no formato correto
- [ ] Fez login no sistema
- [ ] `.env.local` existe e está configurado
- [ ] Console do navegador não mostra erros de rede

---

## 🎯 Testes Básicos

### Teste 1: Servidor Funcionando
```bash
curl http://localhost:3001
# Deve retornar HTML da landing page
```

### Teste 2: API Funcionando
```bash
# (Após fazer login no navegador)
curl http://localhost:3001/api/analyses
# Deve retornar JSON com suas análises
```

### Teste 3: Supabase Conectado
- Acesse: http://localhost:3001/login
- Tente fazer login
- Se funcionar, Supabase está OK

---

## 💡 Dicas

1. **Use o arquivo de teste fornecido**: `test-data/sample_sales.csv` já está no formato correto
2. **Teste primeiro o arquivo válido**: Antes de usar seus próprios dados
3. **Verifique o formato**: Use o exemplo no README para criar seus CSVs
4. **Copie para o Desktop**: Se tiver problemas com permissões de pasta

---

## 📝 Formato CSV Correto

```csv
date,product,category,quantity,price,description
2024-01-15,Camiseta Azul,Roupas,10,29.90,Tamanho M
2024-01-16,Calça Jeans,Roupas,5,89.90,Tamanho 42
```

**Importante**:
- Use vírgula como separador
- Primeira linha deve ser o cabeçalho
- Datas no formato YYYY-MM-DD (ou DD/MM/YYYY ou MM/DD/YYYY)
- Use ponto (.) para decimais, não vírgula
- Campos obrigatórios não podem estar vazios

---

## 🆘 Ainda com Problemas?

Me envie:
1. Mensagem de erro completa do console
2. Navegador e versão que está usando
3. Arquivo CSV que está tentando fazer upload (se possível)
4. Screenshot do erro

Vou te ajudar a resolver! 😊
