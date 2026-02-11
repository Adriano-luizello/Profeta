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
]
