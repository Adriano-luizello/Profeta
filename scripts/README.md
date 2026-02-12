# Scripts

## Seed de dados sintéticos (perfil demo)

Para gerar um perfil completo com dados falsos e tirar screenshots da landing/dashboard:

1. **Crie uma conta** no app (ex: `demo@profeta.com.br`) e **complete o onboarding** (passo 1: empresa; passo 2: supply chain; passo 3: pode pular o upload).

2. No `.env.local` defina:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - (opcional) `DEMO_USER_EMAIL` — se não definir, use na linha de comando abaixo.

3. Rode o seed (a partir da raiz do projeto):

   ```bash
   DEMO_USER_EMAIL=demo@profeta.com.br npm run seed:demo
   ```

   Ou com `npx tsx` direto (se não tiver o script):

   ```bash
   DEMO_USER_EMAIL=demo@profeta.com.br npx tsx scripts/seed-demo-data.ts
   ```

4. Faça login com o email usado e acesse o dashboard. O perfil terá:
   - Uma análise concluída
   - Vários produtos com categorias, preços, estoque e demanda média
   - Fornecedores e configurações de supply chain
   - Histórico de vendas (últimos ~180 dias)
   - Previsões (próximos 90 dias)
   - Recomendações (repor, manter, reduzir, urgente)
   - Alguns “pedidos feitos” para a métrica de stockouts evitados

Assim você consegue expor todas as funcionalidades do dashboard para captura de tela.
