-- Allow all operations on blacklisted_users (admin panel needs INSERT/DELETE)
CREATE POLICY "Allow all access to blacklisted_users"
ON public.blacklisted_users
FOR ALL
USING (true)
WITH CHECK (true);

-- Allow all operations on blacklisted_proofs (admin panel needs INSERT/DELETE)
CREATE POLICY "Allow all access to blacklisted_proofs"
ON public.blacklisted_proofs
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable RLS on bot_staff_access and allow all
ALTER TABLE public.bot_staff_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to bot_staff_access"
ON public.bot_staff_access
FOR ALL
USING (true)
WITH CHECK (true);