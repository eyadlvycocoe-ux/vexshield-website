-- Persistent frame store for live monitoring (edge functions are stateless, so in-memory storage won't work)
CREATE TABLE IF NOT EXISTS public.live_monitor_frames (
  server_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT,
  frame_data TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (server_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_live_monitor_frames_updated_at
  ON public.live_monitor_frames (updated_at DESC);

ALTER TABLE public.live_monitor_frames ENABLE ROW LEVEL SECURITY;

-- Lock down direct client access; access should be via edge function using service role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='live_monitor_frames' AND policyname='No direct access (select)'
  ) THEN
    CREATE POLICY "No direct access (select)" ON public.live_monitor_frames
      FOR SELECT USING (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='live_monitor_frames' AND policyname='No direct access (insert)'
  ) THEN
    CREATE POLICY "No direct access (insert)" ON public.live_monitor_frames
      FOR INSERT WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='live_monitor_frames' AND policyname='No direct access (update)'
  ) THEN
    CREATE POLICY "No direct access (update)" ON public.live_monitor_frames
      FOR UPDATE USING (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='live_monitor_frames' AND policyname='No direct access (delete)'
  ) THEN
    CREATE POLICY "No direct access (delete)" ON public.live_monitor_frames
      FOR DELETE USING (false);
  END IF;
END$$;