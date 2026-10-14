-- Create bans table
CREATE TABLE IF NOT EXISTS public.bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id text NOT NULL,
  player_id text NOT NULL,
  player_name text,
  reason text NOT NULL,
  banned_by text,
  mode text DEFAULT 'Manuel',
  type text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true
);

-- Create kicks table
CREATE TABLE IF NOT EXISTS public.kicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id text NOT NULL,
  player_id text NOT NULL,
  player_name text,
  reason text NOT NULL,
  kicked_by text,
  mode text DEFAULT 'Manuel',
  type text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Create warns table
CREATE TABLE IF NOT EXISTS public.warns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id text NOT NULL,
  player_id text NOT NULL,
  player_name text,
  message text NOT NULL,
  warned_by text,
  mode text DEFAULT 'Manuel',
  type text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all access to bans" ON public.bans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to kicks" ON public.kicks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to warns" ON public.warns FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bans_server_id ON public.bans(server_id);
CREATE INDEX IF NOT EXISTS idx_bans_player_id ON public.bans(player_id);
CREATE INDEX IF NOT EXISTS idx_kicks_server_id ON public.kicks(server_id);
CREATE INDEX IF NOT EXISTS idx_kicks_player_id ON public.kicks(player_id);
CREATE INDEX IF NOT EXISTS idx_warns_server_id ON public.warns(server_id);
CREATE INDEX IF NOT EXISTS idx_warns_player_id ON public.warns(player_id);