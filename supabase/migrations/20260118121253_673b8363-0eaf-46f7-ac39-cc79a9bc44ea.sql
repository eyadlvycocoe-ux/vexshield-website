-- Add guilds column to discord_users to store user's Discord server memberships
ALTER TABLE public.discord_users ADD COLUMN IF NOT EXISTS guilds jsonb DEFAULT '[]'::jsonb;

-- Add server_exemptions column to store per-server unban exemptions
ALTER TABLE public.bans ADD COLUMN IF NOT EXISTS exempted_by_server text[] DEFAULT '{}';

-- Create index for faster blacklist queries
CREATE INDEX IF NOT EXISTS idx_bans_type ON public.bans(type);
CREATE INDEX IF NOT EXISTS idx_bans_is_active ON public.bans(is_active);

-- Comment to explain the columns
COMMENT ON COLUMN public.discord_users.guilds IS 'Array of Discord guilds the user is a member of, fetched via OAuth';
COMMENT ON COLUMN public.bans.exempted_by_server IS 'Server IDs that have exempted this user from the ban (for blacklist bans only)';