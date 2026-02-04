-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create analyses table
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('uploading', 'validating', 'cleaning', 'forecasting', 'recommending', 'completed', 'failed')) DEFAULT 'uploading',
  total_products INTEGER,
  processed_products INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  
  -- Raw data
  original_name TEXT NOT NULL,
  original_category TEXT,
  description TEXT,
  price DECIMAL(10, 2),
  
  -- Cleaned data (from GPT-4)
  cleaned_name TEXT,
  refined_category TEXT,
  attributes JSONB,
  seasonality TEXT,
  ai_confidence DECIMAL(3, 2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sales_history table
CREATE TABLE IF NOT EXISTS public.sales_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  revenue DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create forecasts table
CREATE TABLE IF NOT EXISTS public.forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  forecast_date DATE NOT NULL,
  predicted_quantity DECIMAL(10, 2) NOT NULL,
  lower_bound DECIMAL(10, 2),
  upper_bound DECIMAL(10, 2),
  confidence DECIMAL(3, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create recommendations table
CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('restock', 'maintain', 'reduce', 'urgent_restock')),
  recommended_quantity INTEGER,
  reasoning TEXT NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  estimated_stockout_date DATE,
  additional_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON public.analyses(status);
CREATE INDEX IF NOT EXISTS idx_products_analysis_id ON public.products(analysis_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(refined_category);
CREATE INDEX IF NOT EXISTS idx_sales_product_date ON public.sales_history(product_id, date);
CREATE INDEX IF NOT EXISTS idx_forecasts_product_date ON public.forecasts(product_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_recommendations_product_id ON public.recommendations(product_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analyses table
CREATE POLICY "Users can view their own analyses"
  ON public.analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analyses"
  ON public.analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
  ON public.analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
  ON public.analyses FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for products table
CREATE POLICY "Users can view products from their analyses"
  ON public.products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = products.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert products to their analyses"
  ON public.products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = products.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- RLS Policies for sales_history table
CREATE POLICY "Users can view sales history from their products"
  ON public.sales_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      JOIN public.analyses ON analyses.id = products.analysis_id
      WHERE products.id = sales_history.product_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sales history to their products"
  ON public.sales_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      JOIN public.analyses ON analyses.id = products.analysis_id
      WHERE products.id = sales_history.product_id
      AND analyses.user_id = auth.uid()
    )
  );

-- RLS Policies for forecasts table
CREATE POLICY "Users can view forecasts from their products"
  ON public.forecasts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      JOIN public.analyses ON analyses.id = products.analysis_id
      WHERE products.id = forecasts.product_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert forecasts to their products"
  ON public.forecasts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      JOIN public.analyses ON analyses.id = products.analysis_id
      WHERE products.id = forecasts.product_id
      AND analyses.user_id = auth.uid()
    )
  );

-- RLS Policies for recommendations table
CREATE POLICY "Users can view recommendations from their products"
  ON public.recommendations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      JOIN public.analyses ON analyses.id = products.analysis_id
      WHERE products.id = recommendations.product_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert recommendations to their products"
  ON public.recommendations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      JOIN public.analyses ON analyses.id = products.analysis_id
      WHERE products.id = recommendations.product_id
      AND analyses.user_id = auth.uid()
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at automatically
CREATE TRIGGER update_analyses_updated_at BEFORE UPDATE ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
