
-- 1. Create tables if they don't exist
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    device_name TEXT,
    action TEXT NOT NULL,
    details TEXT,
    ip TEXT,
    location TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.trusted_devices (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    device_name TEXT,
    device_type TEXT,
    location TEXT,
    last_active TEXT,
    status TEXT CHECK (status IN ('approved', 'pending')),
    browser TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Enable RLS (Security)
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- 3. Add permissive policies (required for the app to read/write to these tables)
DROP POLICY IF EXISTS "Allow public access activity_logs" ON public.activity_logs;
CREATE POLICY "Allow public access activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access trusted_devices" ON public.trusted_devices;
CREATE POLICY "Allow public access trusted_devices" ON public.trusted_devices FOR ALL USING (true) WITH CHECK (true);

-- 4. Apply Foreign Key Fixes (Allows deleting users from Auth tab)

-- Trusted Devices: Delete device if user is deleted
ALTER TABLE public.trusted_devices
DROP CONSTRAINT IF EXISTS trusted_devices_user_id_fkey;

ALTER TABLE public.trusted_devices
ADD CONSTRAINT trusted_devices_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Activity Logs: Delete log if user is deleted
ALTER TABLE public.activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;

ALTER TABLE public.activity_logs
ADD CONSTRAINT activity_logs_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Articles: Keep article, remove author link
ALTER TABLE public.articles
DROP CONSTRAINT IF EXISTS articles_user_id_fkey;

ALTER TABLE public.articles
ADD CONSTRAINT articles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE SET NULL;

-- E-Paper Pages: Keep page, remove uploader link
ALTER TABLE public.epaper_pages
DROP CONSTRAINT IF EXISTS epaper_pages_user_id_fkey;

ALTER TABLE public.epaper_pages
ADD CONSTRAINT epaper_pages_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE SET NULL;

-- Staff Invitations: Keep invite, remove creator link
ALTER TABLE public.staff_invitations
DROP CONSTRAINT IF EXISTS staff_invitations_created_by_fkey;

ALTER TABLE public.staff_invitations
ADD CONSTRAINT staff_invitations_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id)
ON DELETE SET NULL;
