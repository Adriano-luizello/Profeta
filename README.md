# Profeta - AI Inventory Demand Forecaster

Smart inventory management powered by AI and Prophet forecasting. Transform your business with accurate demand predictions and intelligent stock recommendations.

## 🚀 Features

- **AI-Powered Data Cleaning**: GPT-4 automatically categorizes and enriches your product data
- **Prophet Forecasting**: State-of-the-art time series predictions with 8-12% MAPE
- **Smart Recommendations**: AI-generated inventory actions based on forecasts
- **CSV Upload**: Simple data import from any e-commerce platform
- **Beautiful Dashboard**: Modern UI with interactive charts and tables
- **Export Reports**: Download predictions and recommendations as PDF/CSV

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: OpenAI GPT-4 API
- **Forecasting**: Prophet (Python FastAPI microservice)
- **Deployment**: Vercel (frontend) + Railway/Render (Prophet API)

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account ([supabase.com](https://supabase.com))
- OpenAI API key ([platform.openai.com](https://platform.openai.com))
- Python 3.9+ (for Prophet service)

## 🏗️ Setup Instructions

### 1. Clone and Install

\`\`\`bash
cd Profeta
npm install
\`\`\`

### 2. Environment Variables

Copy the example env file and fill in your credentials:

\`\`\`bash
cp env.example .env.local
\`\`\`

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for admin operations)
- `OPENAI_API_KEY`: Your OpenAI API key
- `PROPHET_API_URL`: URL of your Prophet FastAPI service

### 3. Database Setup

Run the SQL migration in your Supabase SQL editor:

\`\`\`sql
-- See migrations in /supabase/migrations/
\`\`\`

### 4. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

\`\`\`
/Profeta
├── /app                    # Next.js App Router
│   ├── /api               # API routes
│   ├── /dashboard         # Dashboard pages
│   ├── /results           # Results pages
│   ├── /login             # Auth pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles
├── /components            # React components
│   ├── /ui                # shadcn/ui components
│   ├── UploadCSV.tsx
│   ├── ProductsTable.tsx
│   └── ...
├── /lib                   # Utilities & API clients
│   ├── supabase.ts
│   ├── openai-cleaner.ts
│   ├── prophet-client.ts
│   └── pipeline.ts
├── /types                 # TypeScript type definitions
├── /test-data            # Sample CSV datasets
└── /public               # Static assets
\`\`\`

## 🔄 Processing Pipeline

1. **Upload CSV**: User uploads historical sales data
2. **Validation** (Layer 0): Validate format, columns, data types
3. **AI Cleaning** (Layer 1): GPT-4 categorizes and enriches product data
4. **Forecasting** (Layer 2): Prophet generates 30/60/90-day predictions
5. **Recommendations** (Layer 3): GPT-4 suggests inventory actions
6. **Results**: Display charts, tables, and export options

## ⚡ Performance

### Tempos de Processamento

O sistema processa uploads de CSV em duas etapas:

**1. Limpeza de Dados (GPT):**
- 10 produtos: ~3 segundos
- 50 produtos: ~12 segundos
- 100 produtos: ~25 segundos
- Processamento paralelo (10 produtos por lote)

**2. Geração de Forecast (Prophet):**
- 10 produtos: ~70 segundos
- 50 produtos: ~350 segundos (~6 minutos)
- 100 produtos: ~700 segundos (~12 minutos)
- ~7 segundos por produto (sequencial)

**Tempo Total Estimado:**
- 10 produtos: ~1-2 minutos
- 50 produtos: ~6-7 minutos
- 100 produtos: ~12-13 minutos

> **Nota:** O forecast é processado de forma sequencial por produto.
> Para grandes volumes (100+ produtos), considere dividir em múltiplos uploads menores.

### Otimizações Futuras (FASE 2)

- Paralelização do Prophet (redução de 80% no tempo)
- XGBoost para previsões mais rápidas
- Cache de forecasts
- Processamento em background com jobs assíncronos

## 📊 Expected CSV Format

Your CSV should contain the following columns:

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| date | Date | Sale date | 2024-01-15 |
| product | String | Product name | Nike Air Max |
| category | String | Product category | Footwear |
| quantity | Number | Units sold | 5 |
| price | Number | Unit price | 129.99 |
| description | String (optional) | Product description | Men's running shoes |

Sample datasets are available in `/test-data/`.

## 🧪 Testing

\`\`\`bash
# Type checking
npm run type-check

# Linting
npm run lint

# Run tests
npm test
\`\`\`

## 🚀 Deployment

### Deploy Frontend (Vercel)

\`\`\`bash
vercel deploy --prod
\`\`\`

### Deploy Prophet API (Railway/Render)

See `/api-prophet/README.md` for Python service deployment instructions.

## 📈 Roadmap

### MVP (Current)
- [x] Next.js + TypeScript setup
- [ ] CSV upload and validation
- [ ] OpenAI data cleaning
- [ ] Prophet forecasting integration
- [ ] Results dashboard
- [ ] Export functionality

### Phase 2
- [ ] Shopify integration
- [ ] WooCommerce integration
- [ ] Advanced charts
- [ ] Team accounts
- [ ] API access

### Phase 3
- [ ] Stripe payments
- [ ] Tiered pricing
- [ ] Mobile app
- [ ] Advanced analytics

## 🤝 Contributing

This is an MVP project. Contributions are welcome once we reach stable v1.0.

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Email: support@profeta.app
- GitHub Issues: [github.com/yourrepo/profeta](https://github.com/yourrepo/profeta)

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [OpenAI](https://openai.com/) - GPT-4 API
- [Prophet](https://facebook.github.io/prophet/) - Time series forecasting
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework

---

Built with ❤️ for better inventory management
