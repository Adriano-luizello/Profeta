# Test Data - CSV Examples

Este diretório contém arquivos CSV de exemplo para testar o sistema de upload do Profeta.

## Arquivos Disponíveis

### 1. `sample_sales.csv`
✅ **Arquivo válido com 30 linhas de dados**

- Contém todos os campos obrigatórios
- Datas no formato correto (YYYY-MM-DD)
- Valores numéricos válidos
- 7 produtos únicos
- Categorias: Roupas, Calçados, Acessórios
- Período: Janeiro e Fevereiro de 2024

**Use este arquivo para testar o fluxo completo de upload.**

### 2. `sample_sales_with_errors.csv`
❌ **Arquivo com erros de validação**

Contém os seguintes erros intencionais:
- Linha 3: Produto sem nome (campo vazio)
- Linha 4: Data em formato inválido
- Linha 5: Quantidade negativa
- Linha 6: Preço vazio
- Linha 7: Quantidade não numérica (texto)

**Use este arquivo para testar o sistema de validação e mensagens de erro.**

## Formato Esperado

```csv
date,product,category,quantity,price,description
2024-01-15,Camiseta Azul,Roupas,10,29.90,Tamanho M
```

### Campos Obrigatórios
- `date` - Data da venda (YYYY-MM-DD, DD/MM/YYYY, ou MM/DD/YYYY)
- `product` - Nome do produto
- `quantity` - Quantidade vendida (número positivo)
- `price` - Preço unitário (número não-negativo)

### Campos Opcionais
- `category` - Categoria do produto
- `description` - Descrição adicional
- `supplier` ou `fornecedor` - Nome do fornecedor do produto. Aceita colunas exatas (`Supplier`, `Fornecedor`, etc.) ou que **começam** com `supplier`/`fornecedor` (ex.: `Fornecedor A`, `Fornecedor 1`). Os **valores** da coluna são os nomes dos fornecedores (ex.: "Fornecedor A", "Fornecedor B"). Se presente, o sistema cria ou associa o fornecedor (por org) e vincula ao produto. **Os fornecedores aparecem em Configurações → Fornecedores.** É necessário ter concluído o onboarding (passo 1) para importar fornecedores do CSV.
- `stock` ou `estoque` - Estoque atual (inteiro ≥ 0). Se houver várias linhas por produto, usa o da **data mais recente**. O valor aparece na coluna "Estoque" do dashboard (Supply Chain Intelligence).

## Como Usar

1. Acesse http://localhost:3001/dashboard/upload
2. Arraste um dos arquivos CSV para a área de upload
3. Aguarde a validação
4. Se válido, clique em "Iniciar Análise Preditiva"

## Criando Seus Próprios Arquivos

Você pode criar seus próprios arquivos CSV seguindo o formato acima. Certifique-se de:

1. Incluir o cabeçalho com os nomes das colunas
2. Usar vírgulas como separadores
3. Formatar as datas corretamente
4. Usar pontos (.) para decimais
5. Não deixar campos obrigatórios vazios
