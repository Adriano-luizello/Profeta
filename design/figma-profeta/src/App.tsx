import { useState } from 'react';
import { DashboardCards } from './components/DashboardCards';
import { SKUOverview } from './components/SKUOverview';
import { ChatAnalytics } from './components/ChatAnalytics';
import { LayoutDashboard, Package } from 'lucide-react';

export default function App() {
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sku'>('dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-gray-900">AI Inventory Demand Forecaster</h1>
            <p className="text-sm text-gray-600">Previsão inteligente de demanda e otimização de estoque</p>
          </div>
          <div className="flex items-center gap-3">
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>Últimos 30 dias</option>
              <option>Últimos 90 dias</option>
              <option>Últimos 6 meses</option>
              <option>Último ano</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <LayoutDashboard className="size-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('sku')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'sku'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Package className="size-4" />
            SKU Overview
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-137px)]">
        {/* Chat Analytics */}
        <ChatAnalytics 
          isExpanded={isChatExpanded}
          onToggleExpand={() => setIsChatExpanded(!isChatExpanded)}
        />

        {/* Dashboard Area */}
        <div 
          className={`flex-1 overflow-y-auto p-6 transition-all duration-300 ${
            isChatExpanded ? 'w-0 opacity-0' : 'w-full'
          }`}
        >
          {activeTab === 'dashboard' ? <DashboardCards /> : <SKUOverview />}
        </div>
      </div>
    </div>
  );
}