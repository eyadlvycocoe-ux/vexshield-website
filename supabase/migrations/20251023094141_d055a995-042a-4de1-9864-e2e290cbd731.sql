-- Create servers table to store license configurations
CREATE TABLE public.servers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id TEXT NOT NULL UNIQUE,
  license_key TEXT NOT NULL,
  display_name TEXT,
  status TEXT DEFAULT 'offline',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reports table to store anticheat reports
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id TEXT NOT NULL,
  player_name TEXT,
  player_id TEXT,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Allow all access to servers (as requested)
CREATE POLICY "Allow all access to servers" 
ON public.servers 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Allow all access to reports (as requested)
CREATE POLICY "Allow all access to reports" 
ON public.reports 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_servers_server_id ON public.servers(server_id);
CREATE INDEX idx_reports_server_id ON public.reports(server_id);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);