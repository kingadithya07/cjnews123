
-- Enable UUID extension (Required for uuid_generate_v4)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Enable Row Level Security (RLS)
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Allow public read access to validate tokens (Required for Staff Login check)
CREATE POLICY "Allow public read for validation" ON public.staff_invitations 
FOR SELECT USING (true);

-- 2. Allow authenticated staff to create invites
-- (This ensures Editors logged in can insert rows)
CREATE POLICY "Allow staff to create invites" ON public.staff_invitations 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Allow system/public to update usage timestamp during registration
CREATE POLICY "Allow update usage" ON public.staff_invitations
FOR UPDATE USING (true);
