-- Enable REPLICA IDENTITY FULL for real-time updates on server_resources
ALTER TABLE public.server_resources REPLICA IDENTITY FULL;

-- Add server_resources to supabase_realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_resources;

-- Create unique index on server_id + name for upsert operations
CREATE UNIQUE INDEX IF NOT EXISTS idx_server_resources_server_id_name 
ON public.server_resources (server_id, name);