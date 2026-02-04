# MCP para Supabase no Cursor

Guia para conectar o Cursor ao projeto Supabase (análise de schema, RLS, queries, migrations).

---

## 1. Forma correta de configurar MCP para Supabase

O Supabase oferece um **MCP server oficial (hosted)**. Não é necessário instalar nada localmente.

### Passos

1. **Arquivo de configuração**  
   O arquivo `.cursor/mcp.json` na raiz do projeto já foi criado com:

   ```json
   {
     "mcpServers": {
       "supabase": {
         "url": "https://mcp.supabase.com/mcp"
       }
     }
   }
   ```

2. **Autenticação**  
   - Abra o Cursor e vá em **Settings → Cursor Settings → Tools & MCP**.  
   - O Cursor deve listar o server `supabase`. Na primeira vez, ele vai pedir para fazer login no Supabase (OAuth no browser).  
   - Faça login na conta Supabase e autorize o **organization** que contém o projeto Profeta.  
   - **Não é mais necessário** criar Personal Access Token (PAT); o fluxo é por Dynamic Client Registration.

3. **Escopo por projeto (recomendado)**  
   Para limitar o MCP a um único projeto, use a URL com `project_ref`:

   ```json
   "url": "https://mcp.supabase.com/mcp?project_ref=SEU_PROJECT_REF"
   ```

   O `project_ref` é o ID do projeto no Supabase (ex.: `abcdefghijklmnop` em `https://app.supabase.com/project/abcdefghijklmnop`).

4. **Reiniciar e testar**  
   - Reinicie o Cursor se o server não aparecer.  
   - Teste perguntando: *"Quais tabelas existem no banco? Use as ferramentas MCP."*

---

## 2. Existe MCP server oficial para Supabase?

**Sim.**  
- **Hosted (recomendado):** `https://mcp.supabase.com/mcp` — documentado em [Supabase Docs – MCP](https://supabase.com/docs/guides/getting-started/mcp).  
- **Código aberto:** [supabase-community/supabase-mcp](https://github.com/supabase-community/supabase-mcp) (mesmo server, referência e opções avançadas).

Não é necessário criar um MCP próprio para uso normal; use o oficial.

---

## 3. Se não existisse: como criar um?

Para cenários especiais (CI, rede restrita, ferramentas custom), a documentação cobre:

- **Deploy próprio:** [Supabase – Deploy MCP servers (BYO)](https://supabase.com/docs/guides/getting-started/byo-mcp) com Edge Functions.  
- **Autenticação em CI:** usar PAT no header `Authorization: Bearer <token>` na config do MCP (ver doc oficial, seção “Manual authentication → CI environment”).

Para o seu objetivo (analisar schema, RLS, queries, migrations no Cursor), o server hosted é suficiente.

---

## 4. Alternativas para trabalhar com Supabase no Cursor

| Alternativa | Uso |
|-------------|-----|
| **MCP Supabase (oficial)** | Schema, SQL, RLS, migrations via linguagem natural no Cursor. |
| **Supabase CLI** | `supabase db diff`, `supabase migration up`, local dev. |
| **SQL Editor no Dashboard** | Executar e revisar SQL manualmente. |
| **Branching (Supabase)** | Branch de DB para testar migrations/RLS antes de produção. |

Recomendação: usar **MCP para análise e sugestões** + **migrations em `supabase/migrations/`** versionadas no repo + **CLI/Dashboard** para aplicar e validar.

---

## 5. Segurança e boas práticas (doc oficial)

- **Não conectar MCP a produção** com dados reais; usar projeto de desenvolvimento/staging.  
- **Não dar o MCP para clientes/usuários finais**; é ferramenta de desenvolvedor.  
- **Manter aprovação manual de tool calls** no Cursor (revisar cada chamada antes de executar).  
- **Read-only:** se precisar conectar a dados reais, usar modo read-only (ver [supabase-mcp – read-only](https://github.com/supabase-community/supabase-mcp#read-only-mode)).  
- **Project scoping:** usar `?project_ref=...` para limitar a um projeto.

---

## 6. Resumo do seu projeto: RLS e isolamento por usuário

Com base em `supabase/migrations/`:

### Tabelas principais e RLS

| Tabela | RLS | Isolamento |
|--------|-----|------------|
| `analyses` | ✅ | `user_id = auth.uid()` (SELECT/INSERT/UPDATE/DELETE) |
| `products` | ✅ | Via `analyses`: análise do usuário (SELECT/INSERT/UPDATE) |
| `sales_history` | ✅ | Via `products` → `analyses` (SELECT/INSERT) |
| `forecasts` | ✅ | Via `products` → `analyses` (SELECT/INSERT) |
| `recommendations` | ✅ | Via `products` → `analyses` (SELECT/INSERT/DELETE) |
| `forecast_results` | ✅ | Via `analyses.user_id` (SELECT/INSERT/UPDATE/DELETE) |
| `organizations` | ✅ | Membros da org (SELECT/INSERT/UPDATE) |
| `profeta_users` | ✅ | Apenas o próprio usuário (SELECT/INSERT/UPDATE) |
| `settings` | ✅ | Org do usuário (SELECT/INSERT/UPDATE) |
| `suppliers` | ✅ | Org do usuário (SELECT/INSERT/UPDATE/DELETE) |
| `alert_actions` | ✅ | Via org (SELECT/INSERT) |

### Pontos de atenção

1. **`analyses`** tem `user_id` e opcionalmente `organization_id` (002). As policies de `analyses` usam só `user_id`. Se no futuro tudo for por organização, pode ser necessário ajustar policies para usar `organization_id` + `profeta_users`.
2. **Tabelas filhas** (products, sales_history, forecasts, recommendations, forecast_results) estão corretamente amarradas a `analyses` e, portanto, ao `user_id`.
3. **UPDATE/DELETE:**  
   - `sales_history`, `forecasts`: só SELECT/INSERT; se a app precisar de UPDATE/DELETE, será preciso criar policies.  
   - `products` tem UPDATE (005); `recommendations` tem DELETE (003).

### Próximos passos sugeridos (com MCP)

1. Conectar o MCP ao **projeto de desenvolvimento** (não produção).  
2. Pedir ao Cursor (usando MCP): *“Liste todas as políticas RLS do projeto e verifique se há tabelas sem policy de UPDATE/DELETE onde a app precisa.”*  
3. Escopo por organização: se quiser isolamento por `organization_id` em `analyses`, criar migration com novas policies e testar em branch do Supabase antes de aplicar em produção.

---

## Checklist rápido

- [ ] `.cursor/mcp.json` configurado (já criado no projeto)
- [ ] Cursor reiniciado / MCP recarregado
- [ ] Login Supabase feito no Cursor (OAuth)
- [ ] Opcional: adicionar `?project_ref=...` para escopo a um projeto
- [ ] Teste: “Quais tabelas existem? Use MCP.”
- [ ] Revisar RLS com o Cursor usando MCP (queries de leitura primeiro, em ambiente dev)

Documentação oficial: [Supabase – Model context protocol (MCP)](https://supabase.com/docs/guides/getting-started/mcp).
