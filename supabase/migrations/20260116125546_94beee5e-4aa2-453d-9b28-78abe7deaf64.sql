-- Add bio column to discord_users table
ALTER TABLE public.discord_users 
ADD COLUMN IF NOT EXISTS bio text;

-- Enable RLS on discord_users if not already enabled
ALTER TABLE public.discord_users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read discord_users (for search)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'discord_users' AND policyname = 'Anyone can view discord users') THEN
    CREATE POLICY "Anyone can view discord users" ON public.discord_users FOR SELECT USING (true);
  END IF;
END $$;

-- Allow inserting (for sync)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'discord_users' AND policyname = 'Allow insert for sync') THEN
    CREATE POLICY "Allow insert for sync" ON public.discord_users FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Allow updates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'discord_users' AND policyname = 'Allow update for sync') THEN
    CREATE POLICY "Allow update for sync" ON public.discord_users FOR UPDATE USING (true);
  END IF;
END $$;