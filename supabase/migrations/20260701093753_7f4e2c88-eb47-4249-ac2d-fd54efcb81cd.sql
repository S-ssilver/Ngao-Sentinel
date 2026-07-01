ALTER TABLE public.incident_logs ADD COLUMN IF NOT EXISTS reported_by TEXT;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS reported_by TEXT;