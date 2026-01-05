-- Create the 'churches' table
CREATE TABLE public.churches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    subscription_plan_id UUID, -- Optional, if subscription plans are implemented later
    created_by_user_id UUID REFERENCES auth.users(id), -- Super-Admin who created the church
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS to 'churches' table (Super-Admin can manage all churches)
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super-Admins can view and manage all churches" ON public.churches
FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = TRUE) -- Assuming 'is_super_admin' role/column in auth.users
);

-- Create the 'church_users' table
CREATE TABLE public.church_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- e.g., 'admin', 'member'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (church_id, user_id)
);

-- Add RLS to 'church_users' table
ALTER TABLE public.church_users ENABLE ROW LEVEL SECURITY;

-- Policy: Super-Admins can manage all church_users
CREATE POLICY "Super-Admins can manage all church_users" ON public.church_users
FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = TRUE)
);

-- Policy: Church Admins can manage users within their own church
CREATE POLICY "Church Admins can manage users within their own church" ON public.church_users
FOR ALL USING (
  church_id IN (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() AND role = 'admin')
);


-- Modify 'events' table to include church_id
ALTER TABLE public.events
ADD COLUMN church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE;

-- Update existing events with a default church_id if necessary (for migration of existing data)
-- IMPORTANT: You'll need to decide how to assign existing events to a 'church_id'.
-- For now, this column will be NULLABLE or requires a default for existing data.
-- If all existing data belongs to one "default" church, you would do:
-- UPDATE public.events SET church_id = '[DEFAULT_CHURCH_UUID]' WHERE church_id IS NULL;
-- Then, alter column to be NOT NULL.
-- For a fresh start, you can just make it NOT NULL directly if no existing data.

ALTER TABLE public.events ALTER COLUMN church_id SET NOT NULL; -- Make it mandatory after assigning values or for new data

-- Add RLS to 'events' table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policy: Super-Admins can view and manage all events
CREATE POLICY "Super-Admins can view and manage all events" ON public.events
FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = TRUE)
);

-- Policy: Church Admins can view and manage their own church's events
CREATE POLICY "Church Admins can view and manage their own church's events" ON public.events
FOR ALL USING (
  church_id IN (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() AND role = 'admin')
);

-- Modify 'attendees' table to include church_id
ALTER TABLE public.attendees
ADD COLUMN church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE;

-- Same considerations for existing attendees data as for events.
-- UPDATE public.attendees SET church_id = '[DEFAULT_CHURCH_UUID]' WHERE church_id IS NULL;

ALTER TABLE public.attendees ALTER COLUMN church_id SET NOT NULL;

-- Add RLS to 'attendees' table
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;

-- Policy: Super-Admins can view and manage all attendees
CREATE POLICY "Super-Admins can view and manage all attendees" ON public.attendees
FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND is_super_admin = TRUE)
);

-- Policy: Church Admins can view and manage attendees for their own church's events
CREATE POLICY "Church Admins can view and manage attendees for their own church's events" ON public.attendees
FOR ALL USING (
  church_id IN (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() AND role = 'admin')
);

-- Add 'is_super_admin' column to auth.users if it doesn't exist (only for testing/dev, usually managed by Supabase internal)
-- You might need to add this manually via Supabase SQL editor if not present
-- ALTER TABLE auth.users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
