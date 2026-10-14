-- Create blacklisted Discord servers table
CREATE TABLE public.blacklisted_discord_servers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_server_id text NOT NULL UNIQUE,
  server_name text,
  reason text,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  added_by text
);

-- Enable RLS
ALTER TABLE public.blacklisted_discord_servers ENABLE ROW LEVEL SECURITY;

-- Only admins can manage (via service role), but allow read for checking
CREATE POLICY "Anyone can view blacklisted servers" 
ON public.blacklisted_discord_servers 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage blacklisted servers" 
ON public.blacklisted_discord_servers 
FOR ALL 
USING (true)
WITH CHECK (true);