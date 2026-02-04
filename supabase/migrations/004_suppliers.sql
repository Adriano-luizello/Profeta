-- ============================================
-- Phase 2: Fornecedores (CRUD)
-- ============================================

-- Suppliers (per organization)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lead_time_days INTEGER DEFAULT 30,
  moq INTEGER DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_org ON public.suppliers(organization_id);

-- Add supplier_id to products (nullable)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_supplier ON public.products(supplier_id);

-- RLS: suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view suppliers of own org" ON public.suppliers;
CREATE POLICY "Users can view suppliers of own org"
  ON public.suppliers FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profeta_users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert suppliers for own org" ON public.suppliers;
CREATE POLICY "Users can insert suppliers for own org"
  ON public.suppliers FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profeta_users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update suppliers of own org" ON public.suppliers;
CREATE POLICY "Users can update suppliers of own org"
  ON public.suppliers FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profeta_users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete suppliers of own org" ON public.suppliers;
CREATE POLICY "Users can delete suppliers of own org"
  ON public.suppliers FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profeta_users WHERE id = auth.uid()
    )
  );

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
