export const TOOL_DEFINITIONS = [
  {
    name: 'get_forecast_analysis',
    description:
      'Retorna previsão de demanda com dados históricos e previstos. Use quando o usuário perguntar sobre previsões, demanda futura, ou próximos X dias.',
    input_schema: {
      type: 'object' as const,
      properties: {
        days: {
          type: 'number',
          description: 'Número de dias para previsão (padrão: 30, máximo: 730)',
        },
      },
      required: [] as string[],
    },
  },
  {
    name: 'get_supply_chain_analysis',
    description:
      'Retorna análise completa de supply chain: reorder points, projeção de ruptura, ' +
      'alertas hierárquicos (crítico/atenção/informativo), situação de MOQ, e ' +
      'recomendações de pedido por produto. Use quando o usuário perguntar sobre ' +
      'supply chain, estoque, fornecedores, reordenamento, quando pedir, quanto pedir, ' +
      'ou produtos em risco.',
    input_schema: {
      type: 'object' as const,
      properties: {
        urgency_filter: {
          type: 'string',
          enum: ['all', 'critical', 'attention'],
          description: 'Filtrar por nível de urgência. Default: all.'
        }
      },
      required: [] as string[],
    },
  },
  {
    name: 'get_alerts',
    description:
      'Retorna alertas de ações necessárias, produtos críticos e recomendações urgentes. Use quando usuário perguntar "o que fazer?", "produtos em risco", "alertas", "crítico".',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: 'get_sales_trend',
    description:
      'Retorna tendência de vendas agregadas por mês. Use quando usuário perguntar sobre vendas ao longo do tempo, crescimento, tendências mensais.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: 'get_pareto_analysis',
    description:
      'Análise Pareto 80/20 de rentabilidade: ranking de produtos por receita, contribuição percentual, ' +
      'identificação dos top 20% que geram 80% da receita, cruzamento com supply chain (top sellers em risco de ruptura), ' +
      'e análise por categoria. Use quando o usuário perguntar sobre: produtos mais vendidos, ranking de vendas, ' +
      'quais produtos são mais importantes, análise 80/20, concentração de receita, top performers, quais produtos priorizar, ' +
      'receita por produto, receita por categoria, produtos mais lucrativos, best sellers.',
    input_schema: {
      type: 'object' as const,
      properties: {
        period_days: {
          type: 'number',
          description: 'Período de análise em dias. Default: 90. Opções comuns: 30, 60, 90, 180, 365.',
        },
        view: {
          type: 'string',
          enum: ['products', 'categories', 'at_risk'],
          description:
            'Visão da análise. "products": ranking completo de todos os produtos por receita (default). ' +
            '"categories": receita agrupada por categoria. ' +
            '"at_risk": apenas top sellers com risco de ruptura no supply chain.',
        },
      },
      required: [] as string[],
    },
  },
  {
    name: 'get_dead_stock_analysis',
    description:
      'Análise de estoque parado e produtos de baixa performance: identifica produtos sem vendas ou com vendas muito baixas ' +
      'nos últimos 90 dias, calcula capital preso em estoque, custo de oportunidade mensal, tendência de forecast, ' +
      'e gera recomendações acionáveis (descontinuar, dar desconto, monitorar). Use quando o usuário perguntar sobre: ' +
      'estoque parado, produtos parados, produtos que não vendem, capital preso, stop loss, produtos para descontinuar, ' +
      'produtos para tirar do catálogo, custo de estoque, produtos lentos, slow movers, dead stock, onde está perdendo dinheiro com estoque.',
    input_schema: {
      type: 'object' as const,
      properties: {
        filter: {
          type: 'string',
          enum: ['all', 'dead', 'summary'],
          description:
            'Filtro da análise. "all": lista todos os produtos problemáticos com detalhes (default). ' +
            '"dead": apenas produtos com zero vendas. ' +
            '"summary": resumo executivo com totais e custos.',
        },
      },
      required: [] as string[],
    },
  },
  {
    name: 'get_turnover_analysis',
    description:
      'Análise de velocidade de giro do estoque (Inventory Turnover): calcula quantos dias cada produto/categoria leva para girar ' +
      'seu estoque, eficiência de capital investido (receita por real em estoque), e compara com a média da categoria. ' +
      'Use quando o usuário perguntar sobre: velocidade de giro, inventory turnover, quanto tempo leva para vender o estoque, ' +
      'eficiência do estoque, capital investido em estoque, quais categorias giram mais rápido, produtos com giro lento, ' +
      'otimização de estoque, ou ROI do estoque.',
    input_schema: {
      type: 'object' as const,
      properties: {
        period_days: {
          type: 'number',
          description: 'Período de análise em dias para calcular vendas médias. Default: 90.',
        },
        view: {
          type: 'string',
          enum: ['products', 'categories', 'efficiency'],
          description:
            'Visão da análise. "products": giro por produto individual (default). ' +
            '"categories": giro médio por categoria com % capital vs % receita. ' +
            '"efficiency": ranking de produtos por receita gerada por real investido em estoque.',
        },
      },
      required: [] as string[],
    },
  },
]
