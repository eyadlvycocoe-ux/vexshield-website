-- Enable REPLICA IDENTITY FULL on consoles table for real-time updates
ALTER TABLE public.consoles REPLICA IDENTITY FULL;

-- Add consoles table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.consoles;