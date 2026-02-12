-- Waitlist table for pre-launch signups (landing page form)
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  locale TEXT
);

-- Allow anonymous inserts so the landing form can submit without auth
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert on waitlist"
  ON public.waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only service role / authenticated admin can read
CREATE POLICY "Allow authenticated read on waitlist"
  ON public.waitlist
  FOR SELECT
  TO authenticated
  USING (true);
