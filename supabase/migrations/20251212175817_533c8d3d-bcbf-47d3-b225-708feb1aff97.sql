-- Create feedbacks table for user reviews
CREATE TABLE public.feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name TEXT NOT NULL,
  message TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Anyone can view feedbacks
CREATE POLICY "Anyone can view feedbacks"
ON public.feedbacks
FOR SELECT
USING (true);

-- Anyone can insert feedbacks
CREATE POLICY "Anyone can insert feedbacks"
ON public.feedbacks
FOR INSERT
WITH CHECK (true);

-- Add server_ip and expires_at columns to servers table
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS server_ip TEXT;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;