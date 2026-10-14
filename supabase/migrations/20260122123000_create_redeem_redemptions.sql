-- Track redeem code usage by user to prevent reuse
CREATE TABLE public.redeem_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id UUID NOT NULL REFERENCES public.redeem_codes(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (code_id, discord_id)
);

ALTER TABLE public.redeem_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read redeem redemptions"
ON public.redeem_redemptions
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert redeem redemptions"
ON public.redeem_redemptions
FOR INSERT
WITH CHECK (true);
