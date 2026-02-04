# Profeta - Quick Start Guide

## 🚀 Como Rodar AGORA

### Passo 1: Abrir Terminal

Abra o **Terminal nativo do Mac** (ou iTerm) e execute:

```bash
cd /Users/adrianoluizello/Profeta
npm run dev
```

### Passo 2: Acessar no Navegador

Abra seu navegador em:

```
http://localhost:3000
```

### Passo 3: Ver a Landing Page! 🎉

Você verá:
- Hero section com gradiente azul → roxo
- Título "Profeta - AI Inventory Demand Forecaster"
- 3 cards de features
- Design moderno e responsivo

---

## 🎨 O Que Está Funcionando

✅ Landing page completa  
✅ Design responsivo  
✅ Dark mode automático  
✅ Tailwind CSS  
✅ shadcn/ui configurado  

---

## ❌ O Que AINDA NÃO Funciona

- ❌ Botões "Get Started" e "Learn More" (ainda não têm ação)
- ❌ Login/Signup (Fase 2)
- ❌ Dashboard (Fase 3-7)
- ❌ Upload CSV (Fase 3)
- ❌ AI Processing (Fase 4-6)
- ❌ Gráficos e resultados (Fase 7)

**Isso é normal!** Estamos na Fase 1, apenas setup básico.

---

## 🛠️ Comandos Úteis

```bash
# Rodar desenvolvimento
npm run dev

# Build para produção
npm run build

# Rodar produção
npm start

# Checar TypeScript
npm run type-check

# Linting
npm run lint
```

---

## 🐛 Problemas Comuns

### "Cannot find module..."
**Solução**: Reinstale dependências
```bash
rm -rf node_modules package-lock.json
npm install
```

### "Port 3000 already in use"
**Solução**: Mate o processo ou use outra porta
```bash
# Matar processo na porta 3000
lsof -ti:3000 | xargs kill -9

# Ou rodar em outra porta
PORT=3001 npm run dev
```

### "Permission denied"
**Solução**: Use seu terminal nativo, não o sandbox do Cursor

---

## 📝 Próximos Passos

Depois de ver a landing page funcionando:

1. **Criar contas necessárias**:
   - [Supabase](https://supabase.com) (banco de dados)
   - [OpenAI](https://platform.openai.com) (API GPT-4)

2. **Configurar variáveis de ambiente**:
   - Copie `env.example` para `.env.local`
   - Preencha com suas API keys

3. **Começar Fase 2**:
   - Setup Supabase
   - Criar schema do banco
   - Implementar autenticação

---

## 🎯 Meta Final

MVP completo com:
- ✅ Upload de CSV
- ✅ AI limpeza de dados
- ✅ Prophet forecasting
- ✅ Recomendações de estoque
- ✅ Dashboard com gráficos
- ✅ Export de relatórios

**Estimativa**: 4-5 semanas (~40-50 horas)

---

**Dúvidas?** Pergunte no chat! 💬
