import { useState, useRef, useEffect } from 'react';
import { Send, Maximize2, Minimize2, Sparkles, TrendingUp, Package, AlertTriangle, BarChart3, Lightbulb } from 'lucide-react';
import { ChatMessage } from './ChatMessage';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  chartData?: any;
  chartType?: 'line' | 'bar' | 'pie' | 'table' | 'forecast';
}

interface ChatAnalyticsProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function ChatAnalytics({ isExpanded, onToggleExpand }: ChatAnalyticsProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Olá! Sou seu assistente de previsão de demanda. Posso ajudar com: previsões de vendas, pontos de reordenamento, análise de slow-movers, otimização de estoque e cenários "what-if". Como posso ajudar?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickTriggers = [
    { icon: <TrendingUp className="size-3" />, label: 'Previsão de demanda', query: 'Qual a previsão de demanda para os próximos 30 dias?' },
    { icon: <AlertTriangle className="size-3" />, label: 'Supply chain', query: 'Mostre análise de supply chain com lead time e MOQ' },
    { icon: <Package className="size-3" />, label: 'Product quality', query: 'Quais produtos têm baixa qualidade de listing?' },
    { icon: <BarChart3 className="size-3" />, label: 'Cenário what-if', query: 'E se a demanda aumentar 30%?' },
    { icon: <Lightbulb className="size-3" />, label: 'Ação acionável', query: 'O que devo fazer hoje?' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateResponse = (userMessage: string): Omit<Message, 'id' | 'timestamp'> => {
    const lowerMessage = userMessage.toLowerCase();

    // Previsão de demanda
    if (lowerMessage.includes('previsão') || lowerMessage.includes('previsao') || lowerMessage.includes('demand') || lowerMessage.includes('próximos')) {
      return {
        type: 'assistant',
        content: 'Baseado nos dados históricos e padrões sazonais, aqui está a previsão de demanda para o produto "Smartphone XYZ" nos próximos 30 dias. A previsão indica um aumento de 12% em relação ao período anterior, com pico esperado na semana de 5 a 12 de março.',
        chartType: 'forecast',
        chartData: [
          { date: '15 Jan', actual: 145, forecast: null, lower: null, upper: null },
          { date: '22 Jan', actual: 162, forecast: null, lower: null, upper: null },
          { date: '29 Jan', actual: 138, forecast: null, lower: null, upper: null },
          { date: '5 Fev', actual: 178, forecast: null, lower: null, upper: null },
          { date: '12 Fev', actual: 155, forecast: null, lower: null, upper: null },
          { date: '19 Fev', actual: null, forecast: 168, lower: 153, upper: 183 },
          { date: '26 Fev', actual: null, forecast: 175, lower: 158, upper: 192 },
          { date: '5 Mar', actual: null, forecast: 182, lower: 164, upper: 200 },
          { date: '12 Mar', actual: null, forecast: 190, lower: 170, upper: 210 },
        ],
      };
    }

    // Supply Chain Intelligence
    if (lowerMessage.includes('supply') || lowerMessage.includes('chain') || lowerMessage.includes('lead time') || lowerMessage.includes('moq') || lowerMessage.includes('fornecedor')) {
      return {
        type: 'assistant',
        content: '🚚 Análise de Supply Chain Intelligence:\n\n**Produtos Críticos com Lead Time Alto:**\n\n• **Smartphone XYZ**: Lead time 45 dias, MOQ 100 un\n  → Pedir 200 un HOJE (estoque: 45, crítico)\n  → Com lead time de 45d, pedido deve sair agora\n\n• **Tablet Plus**: Lead time 40 dias, MOQ 50 un\n  → Pedir 150 un HOJE (estoque: 15, crítico)\n\n• **Fone Bluetooth**: Lead time 21 dias, MOQ 200 un\n  → Pedir 300 un em 3 dias (estoque: 28, warning)\n\n**Fornecedores:**\n• CN: 3 produtos (lead time médio: 35d)\n• BR: 1 produto (lead time: 30d)\n• USA: 1 produto (lead time: 35d)\n\n💡 Dica: Produtos com lead time >30 dias precisam planejamento antecipado',
        chartType: 'table',
        chartData: [
          { produto: 'Smartphone XYZ', fornecedor: 'CN', leadTime: '45d', moq: '100', estoque: '45', ação: '📦 Pedir 200 HOJE' },
          { produto: 'Tablet Plus', fornecedor: 'CN', leadTime: '40d', moq: '50', estoque: '15', ação: '📦 Pedir 150 HOJE' },
          { produto: 'Fone Bluetooth', fornecedor: 'CN', leadTime: '21d', moq: '200', estoque: '28', ação: '⏰ Pedir 300 em 3d' },
          { produto: 'Smartwatch', fornecedor: 'USA', leadTime: '35d', moq: '75', estoque: '120', ação: '✓ OK' },
          { produto: 'Notebook Pro', fornecedor: 'BR', leadTime: '30d', moq: '50', estoque: '82', ação: '✓ OK' },
        ],
      };
    }

    // Product Quality Score
    if (lowerMessage.includes('quality') || lowerMessage.includes('qualidade') || lowerMessage.includes('listing') || lowerMessage.includes('imagem')) {
      return {
        type: 'assistant',
        content: '⭐ Análise de Product Listing Quality:\n\n**Produtos com Baixa Qualidade (<80%):**\n\n• **Tablet Plus (58%)**: 2 imagens, sem lifestyle\n  → Adicione 4 fotos lifestyle\n  → Impacto forecast: -8% (vendas reduzidas)\n\n• **Fone Bluetooth (68%)**: 3 imagens, sem lifestyle\n  → Adicione 2 fotos lifestyle\n  → Impacto forecast: -6%\n\n• **Mouse Gamer (72%)**: 4 imagens, sem lifestyle\n  → Melhore descrição e adicione lifestyle\n  → Impacto forecast: -5%\n\n**Produtos de Alta Qualidade:**\n• Notebook Pro (92%): +3% no forecast\n• Smartwatch (88%): +2% no forecast\n\n💡 Melhorar qualidade pode aumentar conversão em 15-25%',
        chartType: 'table',
        chartData: [
          { produto: 'Tablet Plus', score: '58%', imagens: '2', lifestyle: '✗', ajusteForecast: '-8%', ação: 'Adicionar 4 fotos' },
          { produto: 'Fone Bluetooth', score: '68%', imagens: '3', lifestyle: '✗', ajusteForecast: '-6%', ação: 'Adicionar lifestyle' },
          { produto: 'Mouse Gamer', score: '72%', imagens: '4', lifestyle: '✗', ajusteForecast: '-5%', ação: 'Melhorar descrição' },
          { produto: 'Smartphone XYZ', score: '85%', imagens: '6', lifestyle: '✓', ajusteForecast: '+1%', ação: '✓ Bom' },
          { produto: 'Smartwatch', score: '88%', imagens: '5', lifestyle: '✓', ajusteForecast: '+2%', ação: '✓ Ótimo' },
          { produto: 'Notebook Pro', score: '92%', imagens: '8', lifestyle: '✓', ajusteForecast: '+3%', ação: '✓ Excelente' },
        ],
      };
    }

    // Reorder points / produtos críticos
    if (lowerMessage.includes('reorder') || lowerMessage.includes('crítico') || lowerMessage.includes('critico') || lowerMessage.includes('próximo')) {
      return {
        type: 'assistant',
        content: '⚠️ Encontrei 5 produtos que precisam de atenção imediata. Os produtos "Smartphone XYZ" e "Tablet Plus" estão abaixo do reorder point e devem ser reordenados nos próximos 3-5 dias para evitar stockouts.',
        chartType: 'table',
        chartData: [
          { produto: 'Smartphone XYZ', estoque: '45 un', reorderPoint: '50 un', status: '🔴 Crítico', ação: 'Reordenar 200 un até 15/Mar' },
          { produto: 'Tablet Plus', estoque: '15 un', reorderPoint: '30 un', status: '🔴 Crítico', ação: 'Reordenar 150 un até 15/Mar' },
          { produto: 'Fone Bluetooth', estoque: '28 un', reorderPoint: '35 un', status: '🟡 Atenção', ação: 'Reordenar 300 un até 22/Mar' },
          { produto: 'Notebook Pro', estoque: '82 un', reorderPoint: '40 un', status: '🟢 OK', ação: 'Nenhuma ação necessária' },
          { produto: 'Smartwatch', estoque: '120 un', reorderPoint: '60 un', status: '🟢 OK', ação: 'Nenhuma ação necessária' },
        ],
      };
    }

    // Slow-movers
    if (lowerMessage.includes('slow') || lowerMessage.includes('lent') || lowerMessage.includes('parado') || lowerMessage.includes('não vende')) {
      return {
        type: 'assistant',
        content: 'Detectei 3 produtos com desempenho abaixo do esperado. Recomendação: considere desconto promocional para Mouse Gamer RGB (-60% MoM) e Teclado Mecânico (-45% MoM) para liberar capital investido.',
        chartType: 'table',
        chartData: [
          { produto: 'Mouse Gamer RGB', vendas: '8 un/mês', variação: '-60% MoM', diasParado: '12 dias', recomendação: 'Desconto 20%' },
          { produto: 'Teclado Mecânico', vendas: '15 un/mês', variação: '-45% MoM', diasParado: '8 dias', recomendação: 'Desconto 15%' },
          { produto: 'Webcam HD', vendas: '22 un/mês', variação: '-38% MoM', diasParado: '5 dias', recomendação: 'Monitorar' },
        ],
      };
    }

    // Inventory turnover
    if (lowerMessage.includes('turnover') || lowerMessage.includes('rotação') || lowerMessage.includes('rotacao') || lowerMessage.includes('giro')) {
      return {
        type: 'assistant',
        content: 'Seu inventory turnover atual é de 5.8x ao mês, representando uma melhoria de 38% nos últimos 6 meses. Isso significa que você está vendendo e repondo seu estoque quase 6 vezes por mês - um indicador excelente de saúde financeira e eficiência operacional.',
        chartType: 'line',
        chartData: [
          { month: 'Set', value: 4.2 },
          { month: 'Out', value: 4.5 },
          { month: 'Nov', value: 4.8 },
          { month: 'Dez', value: 5.2 },
          { month: 'Jan', value: 5.5 },
          { month: 'Fev', value: 5.8 },
        ],
      };
    }

    // Cenários what-if
    if (lowerMessage.includes('what') || lowerMessage.includes('se') || lowerMessage.includes('cenário') || lowerMessage.includes('cenario')) {
      const scenario = lowerMessage.includes('30%') ? '30%' : lowerMessage.includes('20%') ? '20%' : '30%';
      return {
        type: 'assistant',
        content: `Simulação de cenário: Se a demanda aumentar ${scenario}, você precisará:\n\n• Aumentar estoque médio em ${scenario === '30%' ? '42%' : '28%'}\n• Reduzir lead time em 2-3 dias\n• Adicionar R$ ${scenario === '30%' ? '45.000' : '32.000'} em capital de giro\n• Garantir capacidade com fornecedores\n\nImpacto no inventory turnover: ${scenario === '30%' ? '6.2x' : '6.0x'} (positivo)`,
        chartType: 'bar',
        chartData: [
          { scenario: 'Atual', estoque: 850, capital: 127500 },
          { scenario: 'Cenário +30%', estoque: 1207, capital: 181050 },
        ],
      };
    }

    // Overstock
    if (lowerMessage.includes('overstock') || lowerMessage.includes('excesso') || lowerMessage.includes('muito estoque')) {
      return {
        type: 'assistant',
        content: 'Identifiquei R$ 38.500 em overstock (produtos com mais de 90 dias de cobertura). Recomendação: liquidar produtos parados para liberar 28% de capital atualmente travado.',
        chartType: 'pie',
        chartData: [
          { name: 'Estoque Saudável', value: 89500 },
          { name: 'Overstock', value: 38500 },
        ],
      };
    }

    // Ações acionáveis / hoje
    if (lowerMessage.includes('hoje') || lowerMessage.includes('fazer') || lowerMessage.includes('ação') || lowerMessage.includes('agora')) {
      return {
        type: 'assistant',
        content: '🎯 **AÇÕES PRIORITÁRIAS PARA HOJE:**\n\n**🔴 URGENTE (fazer AGORA):**\n\n1. **Smartphone XYZ**\n   • Pedir 200 unidades HOJE\n   • Lead time: 45 dias (crítico)\n   • MOQ: 100, recomendado: 200 (100 + buffer)\n   • Custo: ~R$ 60.000\n\n2. **Tablet Plus**\n   • Pedir 150 unidades HOJE\n   • Lead time: 40 dias (crítico)\n   • Estoque em 15 un (50% abaixo do mínimo)\n\n**🟡 IMPORTANTE (próximos 3 dias):**\n\n3. **Fone Bluetooth**\n   • Pedir 300 unidades em até 3 dias\n   • MOQ: 200, lead time: 21 dias\n\n4. **Melhorar listings:**\n   • Tablet Plus: adicionar 4 fotos lifestyle (+8% conversão)\n   • Fone Bluetooth: adicionar 2 fotos (+6% conversão)\n\n💰 Total capital necessário: ~R$ 95.000',
      };
    }

    // Resposta padrão
    return {
      type: 'assistant',
      content: 'Posso ajudar com análises sobre:\n\n📊 Previsão de demanda (30, 60, 90 dias)\n📦 Pontos de reordenamento\n⚠️ Produtos críticos e alertas\n📉 Slow-movers e dead stock\n🔄 Inventory turnover\n💡 Cenários "what-if"\n\nSobre qual tema você gostaria de saber mais?',
    };
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI processing
    setTimeout(() => {
      const response = generateResponse(input);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        ...response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1200);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickTrigger = (query: string) => {
    setInput(query);
    setTimeout(() => handleSend(), 100);
  };

  return (
    <div
      className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
        isExpanded ? 'w-full' : 'w-96'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Sparkles className="size-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">AI Demand Assistant</h2>
            <p className="text-xs text-gray-600">Previsão inteligente</p>
          </div>
        </div>
        <button
          onClick={onToggleExpand}
          className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          title={isExpanded ? 'Minimizar' : 'Expandir'}
        >
          {isExpanded ? (
            <Minimize2 className="size-4 text-gray-600" />
          ) : (
            <Maximize2 className="size-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Sparkles className="size-4 text-white" />
            </div>
            <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        {/* Quick Triggers */}
        <div className="mb-3 flex flex-wrap gap-2">
          {quickTriggers.map((trigger, index) => (
            <button
              key={index}
              onClick={() => handleQuickTrigger(trigger.query)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border border-blue-200 rounded-full text-xs font-medium text-gray-700 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {trigger.icon}
              {trigger.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Pergunte sobre demanda, estoque, previsões..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="size-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Pressione Enter para enviar • Shift + Enter para nova linha
        </p>
      </div>
    </div>
  );
}