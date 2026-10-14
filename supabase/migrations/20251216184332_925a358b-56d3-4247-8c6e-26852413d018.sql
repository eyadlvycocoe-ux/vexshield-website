-- Create anticheat_files table to track uploaded versions
CREATE TABLE IF NOT EXISTS public.anticheat_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  version TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.anticheat_files ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view active files
CREATE POLICY "Anyone can view active anticheat files" 
ON public.anticheat_files 
FOR SELECT 
USING (is_active = true);

-- Allow authenticated admins to manage files (we'll check admin role in the edge function)
CREATE POLICY "Service role can manage anticheat files" 
ON public.anticheat_files 
FOR ALL 
USING (true);

-- Create storage bucket for anticheat files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('anticheat-files', 'anticheat-files', true, 52428800)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 52428800;

-- Storage policy for public read
CREATE POLICY "Public read for anticheat files"
ON storage.objects FOR SELECT
USING (bucket_id = 'anticheat-files');

-- Storage policy for service role write
CREATE POLICY "Service role can upload anticheat files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'anticheat-files');

-- Storage policy for service role delete
CREATE POLICY "Service role can delete anticheat files"
ON storage.objects FOR DELETE
USING (bucket_id = 'anticheat-files');