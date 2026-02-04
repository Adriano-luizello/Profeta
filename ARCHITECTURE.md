# Profeta - Technical Architecture

## System Overview

Profeta is an AI-powered inventory demand forecasting system that combines GPT-4 for data processing and recommendations with Facebook Prophet for time series forecasting.

## Architecture Diagram

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│         Next.js Frontend (Vercel)           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Landing  │  │Dashboard │  │ Results  │  │
│  │  Page    │  │   +UI    │  │   Page   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└───────────────────┬─────────────────────────┘
                    │
      ┌─────────────┼─────────────┐
      │             │             │
      ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────────┐
│ Supabase │  │ OpenAI   │  │ Prophet API  │
│ Database │  │ GPT-4    │  │  (Railway)   │
│  + Auth  │  │   API    │  │              │
│ + Storage│  └──────────┘  └──────────────┘
└──────────┘
```

## Data Flow - Processing Pipeline

### Layer 0: Validation
**Input**: Raw CSV file
**Process**:
- Validate file format and structure
- Check required columns exist: `date`, `product`, `category`, `quantity`, `price`
- Validate data types (dates are dates, numbers are numbers)
- Check for minimum data requirements (at least 30 days of history)
- Detect obvious data quality issues

**Output**: 
- Valid/Invalid status
- Detailed error messages if invalid
- Sanitized DataFrame ready for processing

**Tech**: TypeScript, Papa Parse for CSV parsing

---

### Layer 1: AI Data Cleaning
**Input**: Raw product data per unique product
```typescript
{
  product: "Nike air max red",
  category: "shoes", 
  description: "Men's running shoes size 10",
  price: 129.99,
  avg_monthly_sales: 45
}
```

**Process** (OpenAI GPT-4):
- Standardize product categories (e.g., "shoes" → "Footwear > Athletic Shoes")
- Extract structured attributes (size, color, material, gender)
- Identify seasonality patterns (holiday, summer, spring, etc.)
- Assess data quality and confidence score
- Flag potential anomalies

**Prompt Template**:
```
Analyze this e-commerce product and return structured JSON:

Product: {product_name}
Category: {raw_category}
Description: {description}
Price: ${price}
Avg Sales: {avg_monthly_sales} units/month

Return JSON with:
{
  "refined_category": "Main Category > Subcategory",
  "attributes": {
    "color": "...",
    "size": "...",
    "material": "...",
    "gender": "...",
    "brand": "..."
  },
  "seasonality": "none|spring|summer|fall|winter|holiday|year-round",
  "confidence": 0.0-1.0,
  "notes": "Any relevant observations"
}

Be specific and consistent in categorization.
```

**Output**: Cleaned product data with enriched metadata
```typescript
{
  original_product: "Nike air max red",
  cleaned_product: "Nike Air Max",
  refined_category: "Footwear > Athletic Shoes > Running",
  attributes: {
    brand: "Nike",
    color: "Red",
    type: "Running Shoes",
    gender: "Men"
  },
  seasonality: "year-round",
  confidence: 0.95
}
```

**Tech**: OpenAI API (gpt-4), TypeScript

**Cost Estimate**: ~$0.01-0.03 per 50 products

---

### Layer 2: Prophet Forecasting
**Input**: Historical sales time series per product
```json
{
  "product_id": "uuid",
  "history": [
    {"date": "2024-01-01", "quantity": 5},
    {"date": "2024-01-02", "quantity": 3},
    ...
  ],
  "product_metadata": {
    "category": "...",
    "seasonality": "summer",
    "avg_price": 129.99
  }
}
```

**Process** (Prophet Algorithm):
1. Transform data to Prophet format (`ds`, `y`)
2. Configure Prophet model:
   ```python
   Prophet(
       seasonality_mode='multiplicative',  # or 'additive'
       yearly_seasonality=True,
       weekly_seasonality=True,
       daily_seasonality=False,
       holidays=None,  # Can add holiday calendar
       changepoint_prior_scale=0.05
   )
   ```
3. Fit model on historical data
4. Generate forecasts for 30, 60, and 90 days
5. Calculate accuracy metrics (MAPE, MAE, RMSE)
6. Include confidence intervals (upper/lower bounds)

**Output**: Forecast data
```json
{
  "product_id": "uuid",
  "forecasts": [
    {
      "date": "2024-06-01",
      "predicted_quantity": 47.5,
      "lower_bound": 35.2,
      "upper_bound": 59.8,
      "confidence": 0.80
    },
    ...
  ],
  "accuracy": {
    "mape": 11.5,  // Mean Absolute Percentage Error
    "mae": 5.2,    // Mean Absolute Error
    "rmse": 7.8    // Root Mean Square Error
  },
  "model_metadata": {
    "training_days": 365,
    "forecast_days": 90,
    "seasonality_detected": ["yearly", "weekly"]
  }
}
```

**Tech**: Python 3.9+, Prophet, FastAPI (microservice), Pandas, NumPy

**API Endpoint**: 
```
POST /forecast
Body: { product_id, history[], metadata }
Response: { forecasts[], accuracy }
```

**Performance**: 2-5 seconds per product (can batch process)

---

### Layer 3: AI Recommendations
**Input**: Forecast data + business context
```typescript
{
  product: "Nike Air Max",
  category: "Footwear > Athletic Shoes",
  current_stock: 120,
  forecasts_30_days: {
    predicted: 145,
    lower: 110,
    upper: 180
  },
  forecasts_60_days: {
    predicted: 290,
    lower: 220,
    upper: 360
  },
  current_price: 129.99,
  avg_lead_time_days: 14,
  seasonality: "year-round",
  mape: 11.5
}
```

**Process** (OpenAI GPT-4):
- Analyze forecast vs current stock levels
- Consider lead times and safety stock
- Factor in forecast uncertainty (confidence intervals)
- Account for seasonality and trends
- Generate specific, actionable recommendations

**Prompt Template**:
```
You are an inventory management expert. Analyze this product and provide specific stocking recommendations.

Product: {product_name}
Category: {category}
Current Stock: {current_stock} units

30-Day Forecast: {predicted_30d} units (range: {lower_30d}-{upper_30d})
60-Day Forecast: {predicted_60d} units (range: {lower_60d}-{upper_60d})
Forecast Accuracy (MAPE): {mape}%

Lead Time: {lead_time} days
Seasonality: {seasonality}
Current Price: ${price}

Provide recommendations in JSON format:
{
  "action": "restock|maintain|reduce|urgent_restock",
  "recommended_quantity": number,
  "reasoning": "2-3 sentence explanation",
  "risk_level": "low|medium|high",
  "urgency": "low|medium|high|critical",
  "additional_notes": "Any relevant insights"
}

Consider:
1. Will current stock last until lead time?
2. Is there seasonality to account for?
3. What's the forecast uncertainty?
4. What's the optimal safety stock?
```

**Output**: Actionable recommendation
```typescript
{
  product_id: "uuid",
  action: "restock",
  recommended_quantity: 180,
  reasoning: "Current stock of 120 units will be depleted in ~25 days based on forecast. With 14-day lead time, restock now to maintain safety stock. Ordering 180 units provides 60-day coverage with buffer.",
  risk_level: "medium",
  urgency: "high",
  estimated_stockout_date: "2024-06-25",
  safety_stock_recommendation: 30,
  reorder_point: 90,
  additional_notes: "Consider increasing order to 200 units if summer promotion is planned."
}
```

**Tech**: OpenAI API (gpt-4), TypeScript

**Cost Estimate**: ~$0.02-0.04 per 50 products

---

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS 4.0 + shadcn/ui
- **Charts**: Recharts or Chart.js
- **State Management**: React hooks + Server Components
- **Forms**: React Hook Form + Zod validation

### Backend
- **Runtime**: Node.js 22 (Next.js API routes)
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **CSV Parsing**: Papa Parse

### AI/ML Services
- **Data Cleaning**: OpenAI GPT-4 API
- **Recommendations**: OpenAI GPT-4 API
- **Forecasting**: Python Prophet (separate microservice)

### Prophet Microservice
- **Framework**: FastAPI
- **Language**: Python 3.9+
- **Libraries**: Prophet, Pandas, NumPy, Scikit-learn
- **Deployment**: Railway or Render
- **Containerization**: Docker

### Infrastructure
- **Frontend Hosting**: Vercel
- **Database**: Supabase (managed PostgreSQL)
- **Python API**: Railway / Render
- **CDN**: Vercel Edge Network
- **Monitoring**: Vercel Analytics, Sentry

## Database Schema

### `users` (managed by Supabase Auth)
```sql
CREATE TABLE auth.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `analyses`
```sql
CREATE TABLE public.analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT,  -- Supabase Storage URL
  status TEXT NOT NULL CHECK (status IN ('uploading', 'validating', 'cleaning', 'forecasting', 'recommending', 'completed', 'failed')),
  total_products INTEGER,
  processed_products INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_analyses_user_id ON analyses(user_id);
CREATE INDEX idx_analyses_status ON analyses(status);
```

### `products`
```sql
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
  
  -- Raw data
  original_name TEXT NOT NULL,
  original_category TEXT,
  description TEXT,
  price DECIMAL(10, 2),
  
  -- Cleaned data (from GPT-4)
  cleaned_name TEXT,
  refined_category TEXT,
  attributes JSONB,  -- flexible key-value pairs
  seasonality TEXT,
  ai_confidence DECIMAL(3, 2),  -- 0.00 to 1.00
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_analysis_id ON products(analysis_id);
CREATE INDEX idx_products_category ON products(refined_category);
```

### `sales_history`
```sql
CREATE TABLE public.sales_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  revenue DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_product_date ON sales_history(product_id, date);
```

### `forecasts`
```sql
CREATE TABLE public.forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  predicted_quantity DECIMAL(10, 2) NOT NULL,
  lower_bound DECIMAL(10, 2),
  upper_bound DECIMAL(10, 2),
  confidence DECIMAL(3, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_forecasts_product_date ON forecasts(product_id, forecast_date);
```

### `recommendations`
```sql
CREATE TABLE public.recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('restock', 'maintain', 'reduce', 'urgent_restock')),
  recommended_quantity INTEGER,
  reasoning TEXT NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  estimated_stockout_date DATE,
  additional_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recommendations_product_id ON recommendations(product_id);
```

## API Routes

### Next.js API Routes

#### `POST /api/upload`
- Upload CSV file
- Validate format
- Store in Supabase Storage
- Create analysis record
- Return analysis ID

#### `POST /api/process/:analysisId`
- Trigger processing pipeline
- Run all 4 layers sequentially
- Update status in real-time
- Return final results

#### `GET /api/analyses`
- List user's past analyses
- Support pagination
- Filter by status

#### `GET /api/analyses/:id`
- Get analysis details
- Include products, forecasts, recommendations
- Support data export formats (JSON, CSV)

#### `GET /api/analyses/:id/export`
- Export results as PDF or CSV
- Generate downloadable report

### Prophet API Routes

#### `POST /forecast`
- Receive historical data
- Run Prophet model
- Return predictions + metrics

#### `GET /health`
- Health check endpoint

## Processing Pipeline Implementation

```typescript
// lib/pipeline.ts
export async function runPipeline(analysisId: string) {
  try {
    // Layer 0: Validation
    await updateAnalysisStatus(analysisId, 'validating');
    const rawData = await validateCSV(analysisId);
    
    // Layer 1: Cleaning
    await updateAnalysisStatus(analysisId, 'cleaning');
    const cleanedProducts = await cleanProductData(rawData, analysisId);
    
    // Layer 2: Forecasting
    await updateAnalysisStatus(analysisId, 'forecasting');
    const forecasts = await generateForecasts(cleanedProducts, analysisId);
    
    // Layer 3: Recommendations
    await updateAnalysisStatus(analysisId, 'recommending');
    const recommendations = await generateRecommendations(
      forecasts,
      cleanedProducts,
      analysisId
    );
    
    // Complete
    await updateAnalysisStatus(analysisId, 'completed');
    return { success: true, analysisId };
    
  } catch (error) {
    await updateAnalysisStatus(analysisId, 'failed', error.message);
    throw error;
  }
}
```

## Performance Considerations

### Optimization Strategies

1. **Batch Processing**: Process multiple products in parallel
2. **Caching**: Cache GPT-4 responses for identical products
3. **Background Jobs**: Use queue system for long-running tasks
4. **Streaming**: Stream results to UI as they complete
5. **Database Indexing**: Optimize queries with proper indexes

### Expected Processing Times

- **Validation**: < 5 seconds (any file size)
- **Cleaning**: 5-10 minutes (50 products) - GPT-4 calls
- **Forecasting**: 2-5 minutes (50 products) - Prophet calculations  
- **Recommendations**: 1-2 minutes (50 products) - GPT-4 calls

**Total for 50 products: ~10-17 minutes**

### Cost Estimates (per analysis with 50 products)

- OpenAI GPT-4: ~$0.03-0.07
- Supabase: Free tier sufficient for MVP
- Prophet API: ~$0.01 compute time (Railway)
- **Total per analysis: $0.04-0.08**

## Security Considerations

1. **Authentication**: All routes require Supabase auth
2. **Row Level Security**: Users can only access their own data
3. **API Keys**: Stored as environment variables, never exposed to client
4. **File Upload**: Validate file types and sizes, scan for malware
5. **Rate Limiting**: Prevent API abuse
6. **HTTPS**: All traffic encrypted
7. **CORS**: Restrict to trusted domains

## Monitoring & Observability

1. **Error Tracking**: Sentry for exception monitoring
2. **Analytics**: Vercel Analytics for traffic
3. **Logs**: Structured logging with Winston/Pino
4. **Metrics**: Track processing times, success rates, costs
5. **Alerts**: Notify on failures, high costs, performance issues

## Deployment

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Prophet API
PROPHET_API_URL=

# App
NEXT_PUBLIC_APP_URL=
NODE_ENV=production
```

### Vercel Deployment (Frontend)

```bash
vercel deploy --prod
```

### Railway Deployment (Prophet API)

```dockerfile
# Dockerfile for Prophet service
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Future Enhancements

1. **Integrations**: Shopify, WooCommerce, BigCommerce APIs
2. **Real-time Updates**: WebSocket connections for live status
3. **Advanced ML**: Custom models, LSTM, XGBoost
4. **Multi-warehouse**: Support multiple locations
5. **Collaborative**: Team accounts, sharing
6. **API Access**: Public API for developers
7. **Mobile App**: iOS/Android native apps
8. **Advanced Analytics**: Custom reports, dashboards
9. **Internationalization**: Multi-language support
10. **White Label**: Customizable branding

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-01-19  
**Author**: Profeta Team
