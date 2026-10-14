-- Create dashboard commands table for command queuing
CREATE TABLE IF NOT EXISTS public.dashboard_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id TEXT NOT NULL,
  command_type TEXT NOT NULL,
  command_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.dashboard_commands ENABLE ROW LEVEL SECURITY;

-- Allow all access (server uses license key for auth)
CREATE POLICY "Allow all access to dashboard_commands"
ON public.dashboard_commands
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_dashboard_commands_server_pending 
ON public.dashboard_commands(server_id, status) 
WHERE status = 'pending';