-- Create partnerships table
CREATE TABLE public.partnerships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  logo_url TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;

-- Allow public read access to partnerships
CREATE POLICY "Anyone can view partnerships"
ON public.partnerships
FOR SELECT
USING (true);

-- Allow all access for admins (we'll handle this in the app)
CREATE POLICY "Allow all access to partnerships"
ON public.partnerships
FOR ALL
USING (true)
WITH CHECK (true);

-- Create pricing_plans table
CREATE TABLE public.pricing_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL,
  duration TEXT NOT NULL, -- '1month', '3months', 'lifetime'
  price TEXT NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active pricing plans
CREATE POLICY "Anyone can view active pricing plans"
ON public.pricing_plans
FOR SELECT
USING (is_active = true);

-- Allow all access for management
CREATE POLICY "Allow all access to pricing_plans"
ON public.pricing_plans
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default pricing plans
INSERT INTO public.pricing_plans (plan_name, duration, price, features, display_order) VALUES
('Monthly', '1month', '€9.99/month', '["Full access to dashboard", "Real-time player monitoring", "Ban management", "24/7 support"]', 1),
('Quarterly', '3months', '€24.99', '["All Monthly features", "Priority support", "Advanced analytics", "Custom branding"]', 2),
('Lifetime', 'lifetime', '€99.99', '["All features included", "Lifetime updates", "VIP support", "Early access to new features"]', 3);