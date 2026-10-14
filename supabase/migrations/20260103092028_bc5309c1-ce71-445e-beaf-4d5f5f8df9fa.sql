-- Drop existing server_resources table and recreate with consolidated structure
-- Each server will have 1 row with all resources stored as JSONB

DROP TABLE IF EXISTS server_resources;

CREATE TABLE public.server_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id TEXT NOT NULL UNIQUE,
  resources JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.server_resources ENABLE ROW LEVEL SECURITY;

-- Allow all access (same as before)
CREATE POLICY "Allow all access to server_resources" 
ON public.server_resources 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to delete all server data when server is deleted
CREATE OR REPLACE FUNCTION public.delete_server_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all related data for this server
  DELETE FROM public.bans WHERE server_id = OLD.server_id;
  DELETE FROM public.kicks WHERE server_id = OLD.server_id;
  DELETE FROM public.warns WHERE server_id = OLD.server_id;
  DELETE FROM public.reports WHERE server_id = OLD.server_id;
  DELETE FROM public.consoles WHERE server_id = OLD.server_id;
  DELETE FROM public.players_snapshots WHERE server_id = OLD.server_id;
  DELETE FROM public.server_settings WHERE server_id = OLD.server_id;
  DELETE FROM public.server_resources WHERE server_id = OLD.server_id;
  DELETE FROM public.dashboard_commands WHERE server_id = OLD.server_id;
  DELETE FROM public.server_admins WHERE server_id = OLD.server_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-delete server data
DROP TRIGGER IF EXISTS trigger_delete_server_data ON public.servers;
CREATE TRIGGER trigger_delete_server_data
BEFORE DELETE ON public.servers
FOR EACH ROW
EXECUTE FUNCTION public.delete_server_data();