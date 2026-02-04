-- ============================================
-- Phase 1: Organizations, Users, Settings
-- Option A: incremental; analyses keeps user_id, add organization_id (nullable)
-- ============================================

-- Organizations (multi-tenant)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_plan ON public.organizations(plan);

-- Users (extends auth.users; links to org)
CREATE TABLE IF NOT EXISTS public.profeta_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profeta_users_org ON public.profeta_users(organization_id);

-- Settings (one per organization)
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  default_lead_time_days INTEGER DEFAULT 30,
  default_moq INTEGER DEFAULT 100,
  default_safety_stock_multiplier DECIMAL(3,2) DEFAULT 1.5,
  stockout_warning_days INTEGER DEFAULT 14,
  overstock_threshold_multiplier DECIMAL(3,2) DEFAULT 3.0,
  min_data_quality_score DECIMAL(3,2) DEFAULT 0.60,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_settings_org ON public.settings(organization_id);

-- Add organization_id to analyses (nullable for existing rows)
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_analyses_organization_id ON public.analyses(organization_id);

-- RLS: organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org"
  ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM public.profeta_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create org (onboarding)"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own org"
  ON public.organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM public.profeta_users WHERE id = auth.uid()
    )
  );

-- RLS: profeta_users
ALTER TABLE public.profeta_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view self"
  ON public.profeta_users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can insert self"
  ON public.profeta_users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update self"
  ON public.profeta_users FOR UPDATE
  USING (id = auth.uid());

-- RLS: settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view settings of own org"
  ON public.settings FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profeta_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert settings for own org"
  ON public.settings FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profeta_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update settings of own org"
  ON public.settings FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profeta_users WHERE id = auth.uid()
    )
  );

-- Trigger updated_at for organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
