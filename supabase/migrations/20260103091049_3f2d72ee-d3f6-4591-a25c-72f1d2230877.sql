-- Add ban_count column to servers table
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS ban_count INTEGER DEFAULT 0;

-- Update ban_count for existing servers based on current active bans
UPDATE public.servers s
SET ban_count = (
  SELECT COUNT(*) FROM public.bans b 
  WHERE b.server_id = s.server_id AND b.is_active = true
);

-- Create a trigger to auto-increment ban_count when a new ban is inserted
CREATE OR REPLACE FUNCTION public.increment_ban_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    UPDATE public.servers SET ban_count = ban_count + 1 WHERE server_id = NEW.server_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_increment_ban_count ON public.bans;
CREATE TRIGGER trigger_increment_ban_count
AFTER INSERT ON public.bans
FOR EACH ROW
EXECUTE FUNCTION public.increment_ban_count();