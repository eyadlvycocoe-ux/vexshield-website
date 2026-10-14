-- First, clean up duplicate entries in players_snapshots (keep only the latest one)
DELETE FROM public.players_snapshots
WHERE id NOT IN (
  SELECT DISTINCT ON (server_id) id
  FROM public.players_snapshots
  ORDER BY server_id, created_at DESC
);

-- Now add the columns and constraints
ALTER TABLE public.consoles 
DROP COLUMN IF EXISTS event_type,
DROP COLUMN IF EXISTS message,
DROP COLUMN IF EXISTS players_count;

ALTER TABLE public.consoles
ADD COLUMN IF NOT EXISTS logs jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Add unique constraint on server_id for consoles
ALTER TABLE public.consoles 
DROP CONSTRAINT IF EXISTS consoles_server_id_key;

ALTER TABLE public.consoles 
ADD CONSTRAINT consoles_server_id_key UNIQUE (server_id);

-- Add missing columns to players_snapshots
ALTER TABLE public.players_snapshots
ADD COLUMN IF NOT EXISTS total_players integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Add unique constraint on server_id for players_snapshots
ALTER TABLE public.players_snapshots
DROP CONSTRAINT IF EXISTS players_snapshots_server_id_key;

ALTER TABLE public.players_snapshots
ADD CONSTRAINT players_snapshots_server_id_key UNIQUE (server_id);

-- Add last_update column to servers
ALTER TABLE public.servers
ADD COLUMN IF NOT EXISTS last_update timestamp with time zone DEFAULT now();