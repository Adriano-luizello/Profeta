import { TrendingDown, Package, AlertTriangle, RefreshCw, Activity, ArrowUpRight, ArrowDownRight, Clock, Truck, Star, Image as ImageIcon } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const demandForecastData = [
  { date: '15 Jan', actual: 145, forecast: null },
  { date: '22 Jan', actual: 162, forecast: null },
  { date: '29 Jan', actual: 138, forecast: null },
  { date: '5 Fev', actual: 178, forecast: null },
  { date: '12 Fev', actual: 155, forecast: null },
  { date: '19 Fev', actual: null, forecast: 168 },
  { date: '26 Fev', actual: null, forecast: 175 },
  { date: '5 Mar', actual: null, forecast: 182 },
  { date: '12 Mar', actual: null, forecast: 190 },
];

const inventoryStatusData = [
  { product: 'Camiseta Premium Básica', current: 245, reorderPoint: 200, leadTime: 21, moq: 300, supplier: 'Fornecedor BR', status: 'healthy', qualityScore: 0.85 },
  { product: 'Calça Jeans Skinny', current: 180, reorderPoint: 150, leadTime: 30, moq: 200, supplier: 'Fornecedor BR', status: 'healthy', qualityScore: 0.92 },
  { product: 'Vestido Floral Verão', current: 45, reorderPoint: 80, leadTime: 25, moq: 100, supplier: 'Fornecedor PT', status: 'critical', qualityScore: 0.68 },
  { product: 'Tênis Casual Street', current: 320, reorderPoint: 250, leadTime: 35, moq: 150, supplier: 'Fornecedor CN', status: 'healthy', qualityScore: 0.88 },
  { product: 'Jaqueta Jeans Oversized', current: 28, reorderPoint: 60, leadTime: 28, moq: 80, supplier: 'Fornecedor BR', status: 'critical', qualityScore: 0.58 },
];

const turnoverData = [
  { month: 'Set', value: 4.2 },
  { month: 'Out', value: 4.5 },
  { month: 'Nov', value: 4.8 },
  { month: 'Dez', value: 5.2 },
  { month: 'Jan', value: 5.5 },
  { month: 'Fev', value: 5.8 },
];

export function DashboardCards() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<AlertTriangle className="size-5" />}
          title="Stockouts Evitados"
          value="40%"
          change="+12%"
          trend="up"
          color="blue"
          subtitle="vs. mês anterior"
        />
        <KPICard
          icon={<TrendingDown className="size-5" />}
          title="Overstock Reduzido"
          value="35%"
          change="+8%"
          trend="up"
          color="green"
          subtitle="otimização de capital"
        />
        <KPICard
          icon={<RefreshCw className="size-5" />}
          title="Inventory Turnover"
          value="5.8x"
          change="+0.3x"
          trend="up"
          color="purple"
          subtitle="rotação mensal"
        />
        <KPICard
          icon={<Package className="size-5" />}
          title="Produtos Críticos"
          value="8"
          change="-3"
          trend="up"
          color="orange"
          subtitle="próximos ao reorder point"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demand Forecast Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Previsão de Demanda - Produto Top</h3>
              <p className="text-xs text-gray-500">Dados reais vs previsão (próximas 4 semanas)</p>
            </div>
            <Activity className="size-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={demandForecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="actual" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.6}
                name="Vendas Reais"
              />
              <Area 
                type="monotone" 
                dataKey="forecast" 
                stroke="#8b5cf6" 
                fill="#8b5cf6" 
                fillOpacity={0.3}
                strokeDasharray="5 5"
                name="Previsão"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Inventory Turnover */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Inventory Turnover</h3>
              <p className="text-xs text-gray-500">Taxa de rotação de estoque mensal</p>
            </div>
            <RefreshCw className="size-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={turnoverData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Supply Chain Intelligence */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="size-5 text-blue-500" />
          <div>
            <h3 className="font-semibold text-gray-900">Supply Chain Intelligence</h3>
            <p className="text-xs text-gray-500">Lead time, MOQ e recomendações acionáveis</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Produto</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Fornecedor</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Lead Time</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">MOQ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Estoque</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Recomendação</th>
              </tr>
            </thead>
            <tbody>
              {inventoryStatusData.map((item, index) => {
                const needsReorder = item.status === 'critical' || item.status === 'warning';
                const orderQty = needsReorder ? Math.max(item.moq, item.reorderPoint - item.current + Math.round(item.moq * 0.5)) : 0;
                const orderDate = new Date();
                orderDate.setDate(orderDate.getDate() + 3);
                
                return (
                  <tr key={index} className="border-b last:border-b-0 border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{item.product}</span>
                        <span 
                          className={`text-xs px-2 py-0.5 rounded ${
                            item.qualityScore >= 0.8 
                              ? 'bg-green-100 text-green-700' 
                              : item.qualityScore >= 0.6
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          Q: {Math.round(item.qualityScore * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.supplier}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Clock className="size-3 text-gray-400" />
                        <span className="text-sm text-gray-900">{item.leadTime}d</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.moq} un</td>
                    <td className="py-3 px-4">
                      <span className={`text-sm font-medium ${
                        item.status === 'critical' ? 'text-red-600' :
                        item.status === 'warning' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {item.current} un
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {needsReorder ? (
                        <div className="text-xs">
                          <span className="font-semibold text-gray-900">Pedir {orderQty} un HOJE</span>
                          <p className="text-gray-500 mt-0.5">
                            (MOQ {item.moq} + buffer)
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">✓ Estoque OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Quality Score */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Star className="size-5 text-yellow-500" />
          <div>
            <h3 className="font-semibold text-gray-900">Product Listing Quality Score</h3>
            <p className="text-xs text-gray-500">Qualidade afeta conversão e forecast ajustado</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { product: 'Calça Jeans Skinny', images: 8, hasLifestyle: true, descLength: 320, score: 0.92, adjustment: '+3%' },
            { product: 'Camiseta Premium Básica', images: 6, hasLifestyle: true, descLength: 280, score: 0.85, adjustment: '+1%' },
            { product: 'Tênis Casual Street', images: 5, hasLifestyle: true, descLength: 240, score: 0.88, adjustment: '+2%' },
            { product: 'Vestido Floral Verão', images: 3, hasLifestyle: false, descLength: 150, score: 0.68, adjustment: '-6%' },
            { product: 'Jaqueta Jeans Oversized', images: 2, hasLifestyle: false, descLength: 120, score: 0.58, adjustment: '-8%' },
            { product: 'Shorts Moletom Esportivo', images: 4, hasLifestyle: false, descLength: 180, score: 0.72, adjustment: '-5%' },
          ].map((item, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">{item.product}</h4>
                <span className={`text-xs px-2 py-1 rounded font-semibold ${
                  item.score >= 0.8 ? 'bg-green-100 text-green-700' :
                  item.score >= 0.6 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                }`}>
                  {Math.round(item.score * 100)}%
                </span>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Imagens:</span>
                  <span className="font-medium text-gray-900">{item.images} fotos</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Lifestyle:</span>
                  <span className={`font-medium ${item.hasLifestyle ? 'text-green-600' : 'text-red-600'}`}>
                    {item.hasLifestyle ? '✓ Sim' : '✗ Não'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Descrição:</span>
                  <span className="font-medium text-gray-900">{item.descLength} palavras</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Ajuste forecast:</span>
                  <span className={`text-xs font-semibold ${
                    item.adjustment.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.adjustment}
                  </span>
                </div>
              </div>

              {item.score < 0.8 && (
                <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                  <strong>💡 Dica:</strong> {
                    !item.hasLifestyle ? 'Adicione fotos lifestyle' :
                    item.images < 5 ? 'Adicione mais imagens' :
                    'Melhore a descrição'
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Alerts & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reorder Alerts */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="size-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900">Alertas de Reordenamento</h3>
          </div>
          <div className="space-y-3">
            {[
              { product: 'Vestido Floral Verão', qty: 150, moq: 100, leadTime: 25, date: 'HOJE', priority: 'high' },
              { product: 'Jaqueta Jeans Oversized', qty: 120, moq: 80, leadTime: 28, date: 'HOJE', priority: 'high' },
              { product: 'Shorts Moletom Esportivo', qty: 200, moq: 150, leadTime: 18, date: '3 dias', priority: 'medium' },
            ].map((alert, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border-l-4 ${
                  alert.priority === 'high'
                    ? 'bg-red-50 border-red-500'
                    : 'bg-yellow-50 border-yellow-500'
                }`}
              >
                <p className="text-sm font-medium text-gray-900">{alert.product}</p>
                <p className="text-xs text-gray-700 mt-1 font-semibold">
                  📦 Pedir {alert.qty} un até {alert.date}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  MOQ: {alert.moq} un • Lead time: {alert.leadTime} dias
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Slow Movers */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="size-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900">Slow-Movers Detectados</h3>
          </div>
          <div className="space-y-3">
            {[
              { product: 'Jaqueta Jeans Oversized', decline: '-38%', action: 'Desconto 20%', qualityIssue: 'Faltam fotos lifestyle' },
              { product: 'Shorts Moletom Esportivo', decline: '-15%', action: 'Desconto 10%', qualityIssue: null },
              { product: 'Vestido Floral Verão', decline: '-12%', action: 'Monitorar', qualityIssue: 'Descrição curta (150 palavras)' },
            ].map((item, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900">{item.product}</p>
                  <span className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                    {item.action}
                  </span>
                </div>
                <p className="text-xs text-red-600 mb-1">Vendas {item.decline} MoM</p>
                {item.qualityIssue && (
                  <p className="text-xs text-blue-600">
                    ⚠️ {item.qualityIssue}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface KPICardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  color: 'blue' | 'green' | 'purple' | 'orange';
  subtitle: string;
}

function KPICard({ icon, title, value, change, trend, color, subtitle }: KPICardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {trend === 'up' ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
          {change}
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="font-semibold text-gray-900 mb-1">{value}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}