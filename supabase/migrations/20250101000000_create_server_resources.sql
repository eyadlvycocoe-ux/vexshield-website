-- Create server_resources table to store resource information
CREATE TABLE IF NOT EXISTS public.server_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'stopped',
  type TEXT DEFAULT 'existing',
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(server_id, name)
);

-- Enable RLS
ALTER TABLE public.server_resources ENABLE ROW LEVEL SECURITY;

-- Allow all access to server_resources
CREATE POLICY "Allow all access to server_resources" 
ON public.server_resources 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_server_resources_server_id ON public.server_resources(server_id);
CREATE INDEX IF NOT EXISTS idx_server_resources_status ON public.server_resources(status);
CREATE INDEX IF NOT EXISTS idx_server_resources_type ON public.server_resources(type);
