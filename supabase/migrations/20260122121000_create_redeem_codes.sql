-- Create redeem codes table for funds
CREATE TABLE public.redeem_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  funds NUMERIC NOT NULL DEFAULT 0,
  uses_remaining INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.redeem_codes ENABLE ROW LEVEL SECURITY;

-- Allow public read (validation) and admin management handled in app
CREATE POLICY "Anyone can view redeem codes"
ON public.redeem_codes
FOR SELECT
USING (true);

CREATE POLICY "Allow all access to redeem codes"
ON public.redeem_codes
FOR ALL
USING (true)
WITH CHECK (true);

COMMENT ON COLUMN public.redeem_codes.funds IS 'Funds credited when code is redeemed';
COMMENT ON COLUMN public.redeem_codes.uses_remaining IS 'Remaining uses before code expires';
