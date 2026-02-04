import { useState } from 'react';
import { Filter, TrendingUp, AlertTriangle, Star, Package, ChevronDown, Search } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface SKUVariant {
  size: string;
  color: string;
  currentStock: number;
  reorderPoint: number;
  status: 'critical' | 'warning' | 'healthy';
  forecast30d: number;
  forecastTrend: number;
}

interface SKU {
  id: string;
  name: string;
  category: string;
  supplier: string;
  availableSizes: string[];
  availableColors: string[];
  image: string;
  qualityScore: number;
  price: number;
  variants: SKUVariant[];
}

const skuData: SKU[] = [
  {
    id: 'SKU001',
    name: 'Camiseta Premium Básica',
    category: 'Camisetas',
    supplier: 'Fornecedor BR',
    availableSizes: ['P', 'M', 'G', 'GG'],
    availableColors: ['Preto', 'Branco'],
    image: 'https://images.unsplash.com/photo-1685883785814-42d0b197ae64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwdHNoaXJ0JTIwY2xvdGhpbmd8ZW58MXx8fHwxNzY5MTUyOTU4fDA&ixlib=rb-4.1.0&q=80&w=1080',
    qualityScore: 0.85,
    price: 89.90,
    variants: [
      { size: 'P', color: 'Preto', currentStock: 180, reorderPoint: 200, status: 'warning', forecast30d: 320, forecastTrend: 8 },
      { size: 'P', color: 'Branco', currentStock: 220, reorderPoint: 200, status: 'healthy', forecast30d: 380, forecastTrend: 15 },
      { size: 'M', color: 'Preto', currentStock: 245, reorderPoint: 200, status: 'healthy', forecast30d: 420, forecastTrend: 12 },
      { size: 'M', color: 'Branco', currentStock: 280, reorderPoint: 200, status: 'healthy', forecast30d: 450, forecastTrend: 18 },
      { size: 'G', color: 'Preto', currentStock: 210, reorderPoint: 200, status: 'healthy', forecast30d: 390, forecastTrend: 10 },
      { size: 'G', color: 'Branco', currentStock: 190, reorderPoint: 200, status: 'warning', forecast30d: 410, forecastTrend: 14 },
      { size: 'GG', color: 'Preto', currentStock: 150, reorderPoint: 180, status: 'warning', forecast30d: 280, forecastTrend: 5 },
      { size: 'GG', color: 'Branco', currentStock: 160, reorderPoint: 180, status: 'warning', forecast30d: 290, forecastTrend: 7 },
    ],
  },
  {
    id: 'SKU002',
    name: 'Calça Jeans Skinny',
    category: 'Calças',
    supplier: 'Fornecedor BR',
    availableSizes: ['36', '38', '40', '42', '44'],
    availableColors: ['Azul'],
    image: 'https://images.unsplash.com/photo-1666899462970-40dfe2ef3a70?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqZWFucyUyMGRlbmltJTIwcGFudHN8ZW58MXx8fHwxNzY5MTEyNzM1fDA&ixlib=rb-4.1.0&q=80&w=1080',
    qualityScore: 0.92,
    price: 249.90,
    variants: [
      { size: '36', color: 'Azul', currentStock: 120, reorderPoint: 150, status: 'warning', forecast30d: 210, forecastTrend: 12 },
      { size: '38', color: 'Azul', currentStock: 180, reorderPoint: 150, status: 'healthy', forecast30d: 285, forecastTrend: 8 },
      { size: '40', color: 'Azul', currentStock: 200, reorderPoint: 150, status: 'healthy', forecast30d: 320, forecastTrend: 15 },
      { size: '42', color: 'Azul', currentStock: 165, reorderPoint: 150, status: 'healthy', forecast30d: 260, forecastTrend: 5 },
      { size: '44', color: 'Azul', currentStock: 90, reorderPoint: 120, status: 'warning', forecast30d: 180, forecastTrend: 3 },
    ],
  },
  {
    id: 'SKU003',
    name: 'Vestido Floral Verão',
    category: 'Vestidos',
    supplier: 'Fornecedor PT',
    availableSizes: ['P', 'M', 'G'],
    availableColors: ['Rosa', 'Azul'],
    image: 'https://images.unsplash.com/photo-1719552979950-f35958f97ebe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkcmVzcyUyMGZhc2hpb24lMjBjbG90aGluZ3xlbnwxfHx8fDE3NjkxNTI5NTl8MA&ixlib=rb-4.1.0&q=80&w=1080',
    qualityScore: 0.68,
    price: 189.90,
    variants: [
      { size: 'P', color: 'Rosa', currentStock: 45, reorderPoint: 80, status: 'critical', forecast30d: 195, forecastTrend: 15 },
      { size: 'P', color: 'Azul', currentStock: 65, reorderPoint: 80, status: 'warning', forecast30d: 180, forecastTrend: 12 },
      { size: 'M', color: 'Rosa', currentStock: 35, reorderPoint: 80, status: 'critical', forecast30d: 210, forecastTrend: 18 },
      { size: 'M', color: 'Azul', currentStock: 70, reorderPoint: 80, status: 'warning', forecast30d: 195, forecastTrend: 14 },
      { size: 'G', color: 'Rosa', currentStock: 55, reorderPoint: 80, status: 'warning', forecast30d: 170, forecastTrend: 10 },
      { size: 'G', color: 'Azul', currentStock: 50, reorderPoint: 80, status: 'critical', forecast30d: 185, forecastTrend: 13 },
    ],
  },
  {
    id: 'SKU004',
    name: 'Tênis Casual Street',
    category: 'Calçados',
    supplier: 'Fornecedor CN',
    availableSizes: ['36', '38', '40', '42'],
    availableColors: ['Preto', 'Branco'],
    image: 'https://images.unsplash.com/photo-1650320079970-b4ee8f0dae33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbmVha2VycyUyMHNob2VzJTIwZmFzaGlvbnxlbnwxfHx8fDE3NjkxMDc1NjJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    qualityScore: 0.88,
    price: 329.90,
    variants: [
      { size: '36', color: 'Preto', currentStock: 280, reorderPoint: 250, status: 'healthy', forecast30d: 420, forecastTrend: 20 },
      { size: '36', color: 'Branco', currentStock: 310, reorderPoint: 250, status: 'healthy', forecast30d: 450, forecastTrend: 25 },
      { size: '38', color: 'Preto', currentStock: 320, reorderPoint: 250, status: 'healthy', forecast30d: 458, forecastTrend: 22 },
      { size: '38', color: 'Branco', currentStock: 340, reorderPoint: 250, status: 'healthy', forecast30d: 480, forecastTrend: 28 },
      { size: '40', color: 'Preto', currentStock: 300, reorderPoint: 250, status: 'healthy', forecast30d: 435, forecastTrend: 18 },
      { size: '40', color: 'Branco', currentStock: 290, reorderPoint: 250, status: 'healthy', forecast30d: 425, forecastTrend: 16 },
      { size: '42', color: 'Preto', currentStock: 230, reorderPoint: 250, status: 'warning', forecast30d: 380, forecastTrend: 12 },
      { size: '42', color: 'Branco', currentStock: 240, reorderPoint: 250, status: 'warning', forecast30d: 390, forecastTrend: 14 },
    ],
  },
  {
    id: 'SKU005',
    name: 'Jaqueta Jeans Oversized',
    category: 'Jaquetas',
    supplier: 'Fornecedor BR',
    availableSizes: ['P', 'M', 'G', 'GG'],
    availableColors: ['Azul', 'Preto'],
    image: 'https://images.unsplash.com/photo-1706765779494-2705542ebe74?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYWNrZXQlMjBmYXNoaW9uJTIwY2xvdGhpbmd8ZW58MXx8fHwxNzY5MTUyOTYwfDA&ixlib=rb-4.1.0&q=80&w=1080',
    qualityScore: 0.58,
    price: 399.90,
    variants: [
      { size: 'P', color: 'Azul', currentStock: 28, reorderPoint: 60, status: 'critical', forecast30d: 142, forecastTrend: -8 },
      { size: 'P', color: 'Preto', currentStock: 35, reorderPoint: 60, status: 'critical', forecast30d: 138, forecastTrend: -5 },
      { size: 'M', color: 'Azul', currentStock: 42, reorderPoint: 60, status: 'warning', forecast30d: 150, forecastTrend: -3 },
      { size: 'M', color: 'Preto', currentStock: 38, reorderPoint: 60, status: 'critical', forecast30d: 145, forecastTrend: -6 },
      { size: 'G', color: 'Azul', currentStock: 50, reorderPoint: 60, status: 'warning', forecast30d: 155, forecastTrend: -2 },
      { size: 'G', color: 'Preto', currentStock: 45, reorderPoint: 60, status: 'warning', forecast30d: 148, forecastTrend: -4 },
      { size: 'GG', color: 'Azul', currentStock: 32, reorderPoint: 50, status: 'warning', forecast30d: 120, forecastTrend: -10 },
      { size: 'GG', color: 'Preto', currentStock: 30, reorderPoint: 50, status: 'critical', forecast30d: 115, forecastTrend: -12 },
    ],
  },
  {
    id: 'SKU006',
    name: 'Shorts Moletom Esportivo',
    category: 'Shorts',
    supplier: 'Fornecedor PT',
    availableSizes: ['P', 'M', 'G', 'GG'],
    availableColors: ['Preto', 'Cinza'],
    image: 'https://images.unsplash.com/photo-1768854183124-810c9a6d624c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaG9ydHMlMjBmYXNoaW9uJTIwc3VtbWVyfGVufDF8fHx8MTc2OTE1Mjk2MHww&ixlib=rb-4.1.0&q=80&w=1080',
    qualityScore: 0.72,
    price: 149.90,
    variants: [
      { size: 'P', color: 'Preto', currentStock: 95, reorderPoint: 100, status: 'warning', forecast30d: 188, forecastTrend: -15 },
      { size: 'P', color: 'Cinza', currentStock: 105, reorderPoint: 100, status: 'healthy', forecast30d: 195, forecastTrend: -12 },
      { size: 'M', color: 'Preto', currentStock: 110, reorderPoint: 100, status: 'healthy', forecast30d: 205, forecastTrend: -10 },
      { size: 'M', color: 'Cinza', currentStock: 115, reorderPoint: 100, status: 'healthy', forecast30d: 210, forecastTrend: -8 },
      { size: 'G', color: 'Preto', currentStock: 88, reorderPoint: 100, status: 'warning', forecast30d: 180, forecastTrend: -18 },
      { size: 'G', color: 'Cinza', currentStock: 92, reorderPoint: 100, status: 'warning', forecast30d: 185, forecastTrend: -16 },
      { size: 'GG', color: 'Preto', currentStock: 70, reorderPoint: 90, status: 'warning', forecast30d: 150, forecastTrend: -20 },
      { size: 'GG', color: 'Cinza', currentStock: 75, reorderPoint: 90, status: 'warning', forecast30d: 158, forecastTrend: -18 },
    ],
  },
];

export function SKUOverview() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['all', ...Array.from(new Set(skuData.map(sku => sku.category)))];
  const suppliers = ['all', ...Array.from(new Set(skuData.map(sku => sku.supplier)))];

  const filteredSKUs = skuData.filter(sku => {
    if (selectedCategory !== 'all' && sku.category !== selectedCategory) return false;
    if (selectedSupplier !== 'all' && sku.supplier !== selectedSupplier) return false;
    if (selectedStatus !== 'all' && !sku.variants.some(variant => variant.status === selectedStatus)) return false;
    if (searchQuery && !sku.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header with Stats and Search */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900">SKU Overview</h2>
          <p className="text-sm text-gray-600">
            Mostrando {filteredSKUs.length} de {skuData.length} produtos
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="size-4" />
            Filtros
            <ChevronDown className={`size-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'Todas as categorias' : cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fornecedor</label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {suppliers.map(sup => (
                  <option key={sup} value={sup}>
                    {sup === 'all' ? 'Todos os fornecedores' : sup}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os status</option>
                <option value="critical">Crítico</option>
                <option value="warning">Atenção</option>
                <option value="healthy">Saudável</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* SKU Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredSKUs.map((sku) => (
          <SKUCard key={sku.id} sku={sku} />
        ))}
      </div>

      {filteredSKUs.length === 0 && (
        <div className="text-center py-12">
          <Package className="size-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Nenhum produto encontrado com os filtros selecionados</p>
        </div>
      )}
    </div>
  );
}

interface SKUCardProps {
  sku: SKU;
}

function SKUCard({ sku }: SKUCardProps) {
  const [selectedSize, setSelectedSize] = useState<string>(sku.availableSizes[0]);
  const [selectedColor, setSelectedColor] = useState<string>(sku.availableColors[0]);

  // Find the variant that matches selected size and color
  const currentVariant = sku.variants.find(
    v => v.size === selectedSize && v.color === selectedColor
  ) || sku.variants[0];

  const statusConfig = {
    critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    healthy: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-500' },
  };

  const config = statusConfig[currentVariant.status];
  const stockPercentage = (currentVariant.currentStock / currentVariant.reorderPoint) * 100;
  
  // Calculate sold based on forecast (mock data)
  const soldLast30d = Math.floor(currentVariant.forecast30d * 0.85);
  const pendingOrders = Math.floor(currentVariant.forecast30d * 0.15);
  
  // Calculate GMV (Gross Merchandise Value)
  const gmv = (soldLast30d * sku.price) / 1000;

  // Find ALL variants that need reordering (critical or warning)
  const criticalVariants = sku.variants.filter(v => v.status === 'critical');
  const warningVariants = sku.variants.filter(v => v.status === 'warning');

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all group">
      {/* Product Image */}
      <div className="relative h-56 bg-gray-50 overflow-hidden">
        <ImageWithFallback
          src={sku.image}
          alt={sku.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Quality Score Badge - Top Right */}
        <div className="absolute top-3 right-3">
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${
              sku.qualityScore >= 0.8
                ? 'bg-green-500 text-white'
                : sku.qualityScore >= 0.6
                ? 'bg-yellow-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            <Star className="size-3 fill-current" />
            {Math.round(sku.qualityScore * 100)}
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4 space-y-3">
        {/* Product Name */}
        <div>
          <h3 className="font-semibold text-gray-900 text-base">{sku.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{sku.id}</p>
          <p className="text-xs text-gray-400 mt-0.5">{sku.category}</p>
          <p className="text-xs text-gray-400 mt-0.5">EAN: {Math.floor(Math.random() * 9000000000000) + 1000000000000}</p>
          <p className="text-xs text-gray-500 mt-1">{sku.supplier}</p>
        </div>

        {/* Size and Color Selection - MOVIDO PARA CIMA */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          {/* Size Buttons */}
          {sku.availableSizes.length > 1 && (
            <div>
              <label className="text-xs text-gray-600 mb-1.5 block font-medium">Tamanho:</label>
              <div className="flex flex-wrap gap-1.5">
                {sku.availableSizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      selectedSize === size
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Buttons */}
          {sku.availableColors.length > 1 && (
            <div>
              <label className="text-xs text-gray-600 mb-1.5 block font-medium">Cor:</label>
              <div className="flex flex-wrap gap-1.5">
                {sku.availableColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      selectedColor === color
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* GMV */}
        <div className="text-center py-2 border-t border-gray-100">
          <p className="text-2xl font-semibold text-gray-900">R$ {gmv.toFixed(1)}k GMV</p>
        </div>

        {/* Metrics Row 1: Price, Sold, Orders */}
        <div className="grid grid-cols-3 gap-2 text-center py-2 border-t border-gray-100">
          <div>
            <p className="text-base font-semibold text-gray-900">R$ {sku.price.toFixed(0)}</p>
            <p className="text-xs text-gray-500">preço</p>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">{soldLast30d}</p>
            <p className="text-xs text-gray-500">vendidos</p>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">{pendingOrders}</p>
            <p className="text-xs text-gray-500">pedidos</p>
          </div>
        </div>

        {/* Metrics Row 2: Trend, Available, Forecast */}
        <div className="grid grid-cols-3 gap-2 text-center py-2 border-t border-gray-100">
          <div>
            <p className={`text-base font-semibold ${
              currentVariant.forecastTrend >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {currentVariant.forecastTrend > 0 ? '+' : ''}{currentVariant.forecastTrend}%
            </p>
            <p className="text-xs text-gray-500">tendência</p>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">{currentVariant.currentStock}</p>
            <p className="text-xs text-gray-500">disponível</p>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">{currentVariant.forecast30d}</p>
            <p className="text-xs text-gray-500">previsão 30d</p>
          </div>
        </div>

        {/* Stock Status Indicator */}
        <div className={`p-3 rounded-lg border ${config.bg} ${config.border}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${config.dot}`}></div>
              <span className="text-xs font-medium text-gray-700">
                Estoque: {currentVariant.currentStock} / {currentVariant.reorderPoint} un
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                currentVariant.status === 'critical'
                  ? 'bg-red-500'
                  : currentVariant.status === 'warning'
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(stockPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Alerts Section - MOSTRAR TODAS AS VARIANTES QUE PRECISAM REORDENAMENTO */}
        {(criticalVariants.length > 0 || warningVariants.length > 0 || sku.qualityScore < 0.8) && (
          <div className="space-y-2">
            {/* Critical Variants Alerts - URGENTES */}
            {criticalVariants.map((variant) => (
              <div key={`${variant.size}-${variant.color}`} className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="size-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-700">
                    🔴 Reordenar URGENTE
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {variant.size} • {variant.color}
                  </p>
                </div>
              </div>
            ))}

            {/* Warning Variants Alerts - ATENÇÃO */}
            {warningVariants.map((variant) => (
              <div key={`${variant.size}-${variant.color}`} className="flex items-start gap-2 p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="size-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-yellow-700">
                    🟡 Planejar reordenamento
                  </p>
                  <p className="text-xs text-yellow-600 mt-0.5">
                    {variant.size} • {variant.color}
                  </p>
                </div>
              </div>
            ))}

            {/* Quality Alert */}
            {sku.qualityScore < 0.8 && (
              <div className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                <Star className="size-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-700">
                    💡 Melhorar qualidade do listing
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    {sku.qualityScore < 0.6
                      ? 'Adicionar fotos lifestyle e melhorar descrição'
                      : 'Adicionar mais detalhes na descrição'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}