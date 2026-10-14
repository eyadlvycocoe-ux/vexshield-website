-- Enable RLS on consoles and players_snapshots tables as requested
ALTER TABLE public.consoles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all access (as user requested "allow all")
CREATE POLICY "Allow all access to consoles" ON public.consoles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to players_snapshots" ON public.players_snapshots FOR ALL USING (true) WITH CHECK (true);