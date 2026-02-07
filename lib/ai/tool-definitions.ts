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
]
