-- Create server_settings table for anticheat configuration
CREATE TABLE IF NOT EXISTS public.server_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id TEXT NOT NULL UNIQUE,
  anti_objects TEXT[] DEFAULT '{}',
  anti_blackwords TEXT[] DEFAULT '{}',
  discord_webhook TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.server_settings ENABLE ROW LEVEL SECURITY;

-- Allow all access
CREATE POLICY "Allow all access to server_settings"
  ON public.server_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_server_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_server_settings_timestamp
  BEFORE UPDATE ON public.server_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_server_settings_updated_at();