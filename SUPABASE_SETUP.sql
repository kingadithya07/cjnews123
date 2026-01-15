
-- [PREVIOUS TABLES - ASSUMED EXISTING] --

-- Create Staff Invitations Table
CREATE TABLE IF NOT EXISTS public.staff_invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    token UUID NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'EDITOR', 'WRITER')),
    created_by UUID, -- Can link to auth.users if needed, or store ID string
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE
);

-- RLS Policy (Optional: Add if RLS is enabled)
-- ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow read for validation" ON public.staff_invitations FOR SELECT USING (true);
-- CREATE POLICY "Allow insert for staff" ON public.staff_invitations FOR INSERT WITH CHECK (true);
