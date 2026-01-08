-- SQL script to fix infinite recursion in RLS policies for 'church_users' table

-- Step 1: Create helper functions to safely get user context
-- We use SECURITY DEFINER to break the RLS recursion loop.
-- These functions will run with the permissions of the owner, bypassing the policy check on the same table.

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- A super_admin is identified by a NULL church_id. This takes precedence.
  RETURN (SELECT role FROM public.church_users WHERE user_id = auth.uid() ORDER BY church_id NULLS FIRST LIMIT 1);
END;
$$;

CREATE OR REPLACE FUNCTION get_my_church_id()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Returns the church_id for the current user. For super_admin, this will be NULL.
  RETURN (SELECT church_id FROM public.church_users WHERE user_id = auth.uid() ORDER BY church_id NULLS FIRST LIMIT 1);
END;
$$;


-- Step 2: Drop the old, flawed policies on the 'church_users' table
DROP POLICY IF EXISTS "Super-Admins can manage all church_users" ON public.church_users;
DROP POLICY IF EXISTS "Admins can manage their church users" ON public.church_users;


-- Step 3: Create new, correct policies for 'church_users'

-- Policy 1: Super Admins have unrestricted access to the 'church_users' table.
CREATE POLICY "Super Admins full access on church_users"
ON public.church_users
FOR ALL
USING (get_my_role() = 'super_admin')
WITH CHECK (get_my_role() = 'super_admin');


-- Policy 2: Church Admins can view and manage users within their own church.
CREATE POLICY "Church Admins can manage their own church users"
ON public.church_users
FOR ALL
USING (
  -- Users can view records if their church_id matches the row's church_id.
  church_id = get_my_church_id()
)
WITH CHECK (
  -- Users can insert/update records only if they are a 'church_admin' for that church.
  get_my_role() = 'church_admin' AND
  church_id = get_my_church_id()
);
