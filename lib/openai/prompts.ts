/**
 * Sistema de prompts para limpeza e enriquecimento de dados com GPT-4
 */

// Exemplos few-shot para o modelo aprender
export const FEW_SHOT_EXAMPLES = `
EXEMPLO 1:
Input: {"name": "Camiseta Azul", "category": "Roupas", "price": 29.90, "description": "Tamanho M"}
Output:
{
  "cleaned_name": "Camiseta Básica",
  "refined_category": "Vestuário > Camisetas > Básicas",
  "attributes": {
    "cor": "Azul",
    "tamanho": "M",
    "estilo": "Básico",
    "material": "Algodão (inferido)"
  },
  "seasonality": "year-round",
  "expected_return_rate": 0.08,
  "data_quality_score": 75,
  "anomalies_detected": [],
  "ai_confidence": 0.85,
  "reasoning": "Produto comum com informações básicas completas. Categoria refinada com hierarquia clara. Taxa de retorno estimada em 8% baseada em produtos similares de vestuário básico."
}

EXEMPLO 2:
Input: {"name": "Tênis Esportivo", "category": "Calçados", "price": 159.90, "description": "Tamanho 40", "sales_history": [8, 12, 6, 18, 20]}
Output:
{
  "cleaned_name": "Tênis Esportivo",
  "refined_category": "Calçados > Tênis > Esportivo",
  "attributes": {
    "tamanho": "40",
    "tipo": "Esportivo",
    "uso": "Corrida/Academia (inferido)"
  },
  "seasonality": "year-round-peak-summer",
  "expected_return_rate": 0.12,
  "data_quality_score": 65,
  "anomalies_detected": [
    {
      "type": "missing_data",
      "field": "material",
      "severity": "medium",
      "description": "Material do tênis não especificado"
    }
  ],
  "ai_confidence": 0.78,
  "reasoning": "Produto com descrição limitada. Padrão de vendas mostra crescimento (8→20), sugerindo sazonalidade com pico. Taxa de retorno de 12% é típica para calçados esportivos. Falta informação sobre marca e material específico."
}

EXEMPLO 3:
Input: {"name": "Bone Preto", "category": "Acessórios", "price": 35.00, "description": "Ajustável", "sales_history": [20, 25, 30, 35, 40]}
Output:
{
  "cleaned_name": "Boné Ajustável",
  "refined_category": "Acessórios > Chapelaria > Bonés",
  "attributes": {
    "cor": "Preto",
    "tipo": "Ajustável",
    "estilo": "Casual (inferido)"
  },
  "seasonality": "year-round-peak-summer",
  "expected_return_rate": 0.05,
  "data_quality_score": 70,
  "anomalies_detected": [
    {
      "type": "spelling_error",
      "field": "name",
      "severity": "low",
      "description": "Nome do produto com erro ortográfico: 'Bone' deveria ser 'Boné'"
    }
  ],
  "ai_confidence": 0.88,
  "reasoning": "Erro ortográfico corrigido. Produto de acessório com vendas consistentes e crescentes (20→40), indicando demanda saudável. Taxa de retorno baixa (5%) é típica para acessórios simples. Sazonalidade com pico no verão devido ao uso."
}

EXEMPLO 4 (PRESERVAR nome descritivo em português):
Input: {"name": "Cadeira de Escritório Ergonômica", "category": "Móveis", "price": 899.90}
Output:
{
  "cleaned_name": "Cadeira de Escritório Ergonômica",
  "refined_category": "Móveis > Cadeiras > Escritório",
  "attributes": {"tipo": "Ergonômica", "uso": "Escritório"},
  "seasonality": "year-round",
  "expected_return_rate": 0.05,
  "data_quality_score": 85,
  "anomalies_detected": [],
  "ai_confidence": 0.95,
  "reasoning": "Nome já descritivo e claro. Mantido. Categoria refinada com hierarquia."
}

EXEMPLO 5 (PRESERVAR nome em alemão):
Input: {"name": "Kissen-Inlett Sia, Microfaser-Füllung, 50x50cm", "category": "Textiles", "price": 29.99}
Output:
{
  "cleaned_name": "Kissen-Inlett Sia (Almofada)",
  "refined_category": "Têxteis > Almofadas",
  "attributes": {"tamanho": "50x50cm", "material": "Microfibra", "idioma_original": "alemão"},
  "seasonality": "year-round",
  "expected_return_rate": 0.08,
  "data_quality_score": 80,
  "anomalies_detected": [],
  "ai_confidence": 0.9,
  "reasoning": "Nome em alemão preservado. Adicionada tradução entre parênteses. Categoria Textiles refinada para Têxteis > Almofadas."
}

EXEMPLO 6 (nome em inglês - PRESERVAR):
Input: {"name": "LED Bulb GU10, Dimmable, Warm White, 3-Pack", "category": "Lighting", "price": 24.90}
Output:
{
  "cleaned_name": "LED Bulb GU10 (Lâmpada LED)",
  "refined_category": "Iluminação > Lâmpadas > LED",
  "attributes": {"tipo": "GU10", "dimmable": true, "cor": "warm_white", "quantidade": 3},
  "seasonality": "year-round",
  "expected_return_rate": 0.03,
  "data_quality_score": 88,
  "anomalies_detected": [],
  "ai_confidence": 0.95,
  "reasoning": "Nome em inglês preservado com tradução. Categoria refinada."
}

EXEMPLO 7 (apenas código/SKU - manter código, categoria genérica):
Input: {"name": "DEQ17TRA63136-97444", "category": null, "price": 15.90, "sales_history": [100, 120, 350]}
Output:
{
  "cleaned_name": "Produto DEQ17TRA63136",
  "refined_category": "Produtos Diversos",
  "attributes": {"codigo": "DEQ17TRA63136"},
  "seasonality": "year-round-peak-holidays",
  "expected_return_rate": 0.1,
  "data_quality_score": 45,
  "anomalies_detected": [{"type": "missing_data", "field": "name", "severity": "medium", "description": "Apenas código disponível"}],
  "ai_confidence": 0.4,
  "reasoning": "Apenas código disponível. Mantido código sem sufixo. Categoria genérica 'Produtos Diversos'. Nunca use 'Produto Desconhecido' ou 'Não Classificado'."
}

EXEMPLO 8 (SKU com sufixo variante - inferir produto e variante):
Input: {"name": "DEQ17TRA08840-97446", "category": "Textiles", "price": 29.99, "description": null, "sales_history": [120, 115, 130, 125, 140]}
Output:
{
  "cleaned_name": "Almofada Sia 50x50cm",
  "refined_category": "Têxteis > Almofadas",
  "attributes": {"sku": "DEQ17TRA08840-97446", "base_product": "Kissen-Inlett Sia", "variant_code": "97446", "inferred_size": "50x50cm"},
  "seasonality": "year-round",
  "expected_return_rate": 0.08,
  "data_quality_score": 55,
  "anomalies_detected": [{"type": "inferred_data", "field": "name", "severity": "low", "description": "Nome inferido a partir de SKU e categoria Textiles"}],
  "ai_confidence": 0.6,
  "reasoning": "SKU com sufixo -97446. Categoria Textiles sugere têxtil/almofada. Preço 29.99 compatível com almofada pequena. Inferido 'Almofada Sia 50x50cm'. SKU completo em attributes.sku."
}

EXEMPLO 9 (SKU diferente, mesmo produto base - variante por preço):
Input: {"name": "DEQ17TRA08840-208462", "category": "Textiles", "price": 34.99, "sales_history": [80, 75, 90, 85, 95]}
Output:
{
  "cleaned_name": "Almofada Sia 60x60cm",
  "refined_category": "Têxteis > Almofadas",
  "attributes": {"sku": "DEQ17TRA08840-208462", "base_product": "Kissen-Inlett Sia", "variant_code": "208462", "inferred_size": "60x60cm"},
  "seasonality": "year-round",
  "expected_return_rate": 0.08,
  "data_quality_score": 55,
  "anomalies_detected": [{"type": "inferred_data", "field": "name", "severity": "low", "description": "Variante inferida: preço maior que 97446 sugere tamanho maior"}],
  "ai_confidence": 0.6,
  "reasoning": "Mesmo base DEQ17TRA08840, sufixo 208462. Preço 34.99 > 29.99 do exemplo anterior, sugere variante maior (60x60cm). Nome descritivo com variante para diferenciar SKUs."
}
`

/**
 * Cria o prompt para limpeza de um produto
 */
export function createCleaningPrompt(
  name: string,
  category: string | null,
  price: number,
  description: string | null,
  salesHistory: number[]
): string {
  return `Você é um especialista em análise de dados de e-commerce. Sua tarefa é limpar, padronizar e enriquecer informações de produtos.

EXEMPLOS DE REFERÊNCIA:
${FEW_SHOT_EXAMPLES}

INSTRUÇÕES:
1. Corrija erros ortográficos e padronize nomes quando necessário
2. Refine a categoria usando hierarquia clara (ex: "Vestuário > Camisetas > Básicas")
3. Extraia todos os atributos mencionados e infira outros baseado no contexto
4. Identifique sazonalidade: "year-round", "seasonal-winter", "seasonal-summer", "year-round-peak-summer", etc.
5. Estime taxa de retorno esperada (0.0 a 1.0) baseado na categoria e tipo de produto
6. Calcule score de qualidade (0-100) baseado na completude dos dados
7. Detecte anomalias: erros, dados faltantes, valores suspeitos
8. Forneça raciocínio claro para suas decisões

REGRAS IMPORTANTES PARA LIMPEZA:

1. PRESERVAÇÃO DE NOMES:
   - Se o nome já for descritivo e claro, MANTENHA-O
   - Apenas simplifique nomes muito longos (>60 caracteres)
   - NUNCA use "Produto Desconhecido" - sempre mantenha o nome original ou adicione contexto (ex: "Produto [código]")
   - Aceite nomes em qualquer idioma (português, inglês, alemão, etc.)

2. LIMPEZA PERMITIDA:
   - Remover códigos/SKUs do final (ex: "Cadeira XYZ-123" → "Cadeira XYZ")
   - Padronizar capitalização
   - Corrigir erros de digitação óbvios
   - Para nomes em outros idiomas: manter original e adicionar tradução entre parênteses se útil

3. CATEGORIZAÇÃO:
   - Se a categoria já estiver clara e correta, MANTENHA-A (refinando hierarquia se possível)
   - Use "Produtos Diversos" apenas quando realmente não houver informação de categoria
   - NUNCA use "Não Classificado" ou "Desconhecido" como categoria

4. CONFIANÇA:
   - ai_confidence: 0.9-1.0 quando nome e categoria já são bons
   - ai_confidence: 0.6-0.8 quando precisou inferir/limpar
   - ai_confidence: 0.3-0.5 quando dados são escassos (ex: só código)

5. TRATAMENTO DE SKUs E VARIANTES:
   - SKUs com sufixos diferentes (ex: -97446, -208462) são variantes do mesmo produto base
   - Tente inferir a variante baseado em preço, vendas, categoria ou padrões (ex: tamanho 50x50cm vs 60x60cm)
   - Mantenha o SKU completo em attributes.sku
   - Use cleaned_name descritivo com variante quando possível (ex: "Almofada Sia 50x50cm")
   - Se não conseguir inferir: use "Produto [base-code] Var.[sufixo]" (ex: "Produto DEQ17TRA08840 Var.97446")
   - Inclua base_product e variant_code em attributes quando identificar padrão DEQ...-XXXXX

PRODUTO A ANALISAR:
{
  "name": "${name.replace(/"/g, '\\"')}",
  "category": ${category ? `"${category.replace(/"/g, '\\"')}"` : 'null'},
  "price": ${price},
  "description": ${description ? `"${description.replace(/"/g, '\\"')}"` : 'null'},
  "sales_history": ${JSON.stringify(salesHistory)}
}

IMPORTANTE:
- Retorne APENAS JSON válido, sem markdown ou explicações extras
- Use o formato exato dos exemplos acima
- PRIORIZE preservar nomes descritivos existentes
- Nunca use "Produto Desconhecido" ou "Não Classificado"
- Se o nome já for bom, mantenha-o (com alta ai_confidence)
- Para nomes em outros idiomas, mantenha o original e adicione tradução entre parênteses se útil
- Baseie-se em dados reais de e-commerce
- Identifique anomalias mesmo que pequenas

Retorne o JSON da análise:`
}

/**
 * Prompt para validação de dados limpos
 */
export function createValidationPrompt(cleanedData: any): string {
  return `Valide os seguintes dados limpos e identifique problemas:

${JSON.stringify(cleanedData, null, 2)}

Retorne JSON com:
{
  "is_valid": true/false,
  "issues": ["lista de problemas encontrados"],
  "suggestions": ["sugestões de melhoria"]
}`
}
