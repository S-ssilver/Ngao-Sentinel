
CREATE TYPE public.shift_type AS ENUM ('Day','Night');
CREATE TYPE public.attendance_status AS ENUM ('Present','Absent','Late','Replacement Required');
CREATE TYPE public.incident_type AS ENUM ('Theft','Assault/Violence','Trespassing','Vandalism/Damage','Medical Emergency','Fire','Equipment Failure','Other');
CREATE TYPE public.severity AS ENUM ('Low','Medium','High');

CREATE TABLE public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name text NOT NULL UNIQUE,
  company_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  location_code text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO anon, authenticated;
GRANT ALL ON public.sites TO service_role;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read sites" ON public.sites FOR SELECT USING (true);
CREATE POLICY "public write sites" ON public.sites FOR INSERT WITH CHECK (true);
CREATE POLICY "public update sites" ON public.sites FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete sites" ON public.sites FOR DELETE USING (true);

CREATE TABLE public.attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  guard_name text NOT NULL,
  shift_type public.shift_type NOT NULL,
  status public.attendance_status NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_logs TO anon, authenticated;
GRANT ALL ON public.attendance_logs TO service_role;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read attendance" ON public.attendance_logs FOR SELECT USING (true);
CREATE POLICY "public write attendance" ON public.attendance_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "public update attendance" ON public.attendance_logs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete attendance" ON public.attendance_logs FOR DELETE USING (true);
CREATE INDEX attendance_site_idx ON public.attendance_logs(site_id);
CREATE INDEX attendance_created_idx ON public.attendance_logs(created_at DESC);

CREATE TABLE public.incident_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  incident_type public.incident_type NOT NULL,
  other_type text,
  severity public.severity NOT NULL,
  description text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_logs TO anon, authenticated;
GRANT ALL ON public.incident_logs TO service_role;
ALTER TABLE public.incident_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read incidents" ON public.incident_logs FOR SELECT USING (true);
CREATE POLICY "public write incidents" ON public.incident_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "public update incidents" ON public.incident_logs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete incidents" ON public.incident_logs FOR DELETE USING (true);
CREATE INDEX incident_site_idx ON public.incident_logs(site_id);
CREATE INDEX incident_created_idx ON public.incident_logs(created_at DESC);
