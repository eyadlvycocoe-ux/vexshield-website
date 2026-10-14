-- Add permissions column to server_admins table
ALTER TABLE public.server_admins 
ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '[]'::jsonb;

-- Add comment explaining the permissions structure
COMMENT ON COLUMN public.server_admins.permissions IS 'Array of permission strings: dashboard, players, bans, kicks, warns, settings, resources, logs, console, map, all';