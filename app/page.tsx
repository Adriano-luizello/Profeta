export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Profeta
          </h1>
          <h2 className="text-3xl md:text-4xl font-semibold mb-8 text-foreground">
            AI Inventory Demand Forecaster
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto">
            Transform your inventory management with AI-powered demand forecasting. 
            Reduce costs, prevent stockouts, and make data-driven decisions.
          </p>
          
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="/signup" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors">
              Get Started
            </a>
            <a href="/login" className="px-8 py-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg font-semibold text-lg transition-colors">
              Sign In
            </a>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Why Profeta?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm">
              <div className="text-4xl mb-4">🎯</div>
              <h4 className="text-xl font-semibold mb-3">Accurate Forecasts</h4>
              <p className="text-gray-600 dark:text-gray-400">
                MAPE 8-12% vs 35% with traditional methods. Prophet-powered predictions you can trust.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm">
              <div className="text-4xl mb-4">🤖</div>
              <h4 className="text-xl font-semibold mb-3">AI-Powered Insights</h4>
              <p className="text-gray-600 dark:text-gray-400">
                GPT-4 analyzes your data, categorizes products, and provides actionable recommendations.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm">
              <div className="text-4xl mb-4">⚡</div>
              <h4 className="text-xl font-semibold mb-3">Fast & Simple</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Upload your CSV, get results in minutes. No complex setup or data science expertise required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-600 dark:text-gray-400">
        <p>© 2026 Profeta. Built with AI for smarter inventory management.</p>
      </footer>
    </div>
  );
}
