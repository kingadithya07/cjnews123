
-- 1. FIX DELETION ERRORS
-- Change constraints so deleting a user in Auth tab doesn't break the database.

-- For Trusted Devices: Delete the device if the user is deleted (CASCADE)
ALTER TABLE public.trusted_devices
DROP CONSTRAINT IF EXISTS trusted_devices_user_id_fkey;

ALTER TABLE public.trusted_devices
ADD CONSTRAINT trusted_devices_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;

-- For Activity Logs: Delete the log if the user is deleted (CASCADE)
ALTER TABLE public.activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;

ALTER TABLE public.activity_logs
ADD CONSTRAINT activity_logs_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;

-- For Articles: Keep the article, but set user_id to NULL (SET NULL)
-- This preserves content even if the staff member is removed.
ALTER TABLE public.articles
DROP CONSTRAINT IF EXISTS articles_user_id_fkey;

ALTER TABLE public.articles
ADD CONSTRAINT articles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE SET NULL;

-- For E-Paper Pages: Keep the page, set user_id to NULL
ALTER TABLE public.epaper_pages
DROP CONSTRAINT IF EXISTS epaper_pages_user_id_fkey;

ALTER TABLE public.epaper_pages
ADD CONSTRAINT epaper_pages_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE SET NULL;

-- For Staff Invitations: If creator is deleted, keep invite but set creator null
ALTER TABLE public.staff_invitations
DROP CONSTRAINT IF EXISTS staff_invitations_created_by_fkey;

ALTER TABLE public.staff_invitations
ADD CONSTRAINT staff_invitations_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id)
ON DELETE SET NULL;
