-- Schedule cleanup of expired servers every hour
SELECT cron.schedule(
  'cleanup-expired-servers-hourly',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://ryajrixmchazddlepokk.supabase.co/functions/v1/cleanup-expired-servers',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5YWpyaXhtY2hhemRkbGVwb2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMDY3MzcsImV4cCI6MjA3Njc4MjczN30.-r_cLguvN0bOsXIcJlRXAta9iOPFU4IHnpS6Z16iji0"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);