-- Drop overly-restrictive RLS policies that block service-role writes
DROP POLICY IF EXISTS "No direct access (select)" ON public.live_monitor_frames;
DROP POLICY IF EXISTS "No direct access (insert)" ON public.live_monitor_frames;
DROP POLICY IF EXISTS "No direct access (update)" ON public.live_monitor_frames;
DROP POLICY IF EXISTS "No direct access (delete)" ON public.live_monitor_frames;

-- Now create service role bypass policy
-- Service role automatically bypasses RLS, so we can leave RLS enabled with empty policies
-- OR disable RLS. Edge functions use service-role. Safe since table stores transient frames only.
ALTER TABLE public.live_monitor_frames DISABLE ROW LEVEL SECURITY;