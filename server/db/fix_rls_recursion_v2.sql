-- server/db/fix_rls_recursion_v2.sql

-- This script fixes the infinite recursion issue on RLS policies for the 'church_users_v2' and 'churches_v2' tables.
-- The original policies contained subqueries on 'church_users_v2' or 'churches_v2' itself, causing a loop.
-- These new policies use the existing SECURITY DEFINER helper functions (get_user_role, get_user_church_id)
-- to safely access user information without triggering recursion.

BEGIN;

-- Ensure the helper functions are defined as SECURITY DEFINER, which is crucial for breaking the recursion loop.
-- These functions should have been created by 'v2_migration_to_multitenant.sql'.
-- We are just creating/replacing them here to be sure they are correct and point to the v2 table.

CREATE OR REPLACE FUNCTION get_user_role(user_id_input UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- This function now runs with the permissions of the definer, bypassing the caller's RLS.
    RETURN (SELECT role FROM public.church_users_v2 WHERE user_id = user_id_input LIMIT 1);
END;
$$;

CREATE OR REPLACE FUNCTION get_user_church_id(user_id_input UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- This function also runs with the permissions of the definer.
    RETURN (SELECT church_id FROM public.church_users_v2 WHERE user_id = user_id_input LIMIT 1);
END;
$$;


-- 1. Drop the old, recursive policies on 'church_users_v2' and 'churches_v2'
DROP POLICY IF EXISTS "Super-Admins can manage all church_users_v2" ON public.church_users_v2;
DROP POLICY IF EXISTS "Admins can manage their church users_v2" ON public.church_users_v2;
DROP POLICY IF EXISTS "Super-Admins can manage all churches_v2" ON public.churches_v2;
DROP POLICY IF EXISTS "Admins can manage their church_v2" ON public.churches_v2;

-- Also drop any potentially conflicting policies that might have been created with different names
DROP POLICY IF EXISTS "Super Admins can do all on church_users_v2" ON public.church_users_v2;
DROP POLICY IF EXISTS "Church Admins can manage their church users on church_users_v2" ON public.church_users_v2;
DROP POLICY IF EXISTS "Users can see their own entry in church_users_v2" ON public.church_users_v2;
DROP POLICY IF EXISTS "RLS: Super Admins full access on church_users_v2" ON public.church_users_v2;
DROP POLICY IF EXISTS "RLS: Church Admins manage their own church users on church_users_v2" ON public.church_users_v2;
DROP POLICY IF EXISTS "RLS: Users can see own entry in church_users_v2" ON public.church_users_v2;

DROP POLICY IF EXISTS "Super Admins can do all on churches_v2" ON public.churches_v2;
DROP POLICY IF EXISTS "Church Admins can manage their church data on churches_v2" ON public.churches_v2;
DROP POLICY IF EXISTS "RLS: Super Admins full access on churches_v2" ON public.churches_v2;
DROP POLICY IF EXISTS "RLS: Church Admins manage their own churches_v2" ON public.churches_v2;
DROP POLICY IF EXISTS "RLS: Public read access for churches_v2" ON public.churches_v2;


-- 2. Create new, non-recursive policies for 'church_users_v2'

-- Policy for Super Admins: They can manage all records in church_users_v2.
CREATE POLICY "RLS: Super Admins full access on church_users_v2"
ON public.church_users_v2
FOR ALL
USING (get_user_role(auth.uid()) = 'super_admin')
WITH CHECK (get_user_role(auth.uid()) = 'super_admin');

-- Policy for Church Admins: They can see and manage users only within their own church.
CREATE POLICY "RLS: Church Admins manage their own church users on church_users_v2"
ON public.church_users_v2
FOR ALL
USING (
    church_id = get_user_church_id(auth.uid())
)
WITH CHECK (
    church_id = get_user_church_id(auth.uid()) AND
    get_user_role(auth.uid()) = 'church_admin'
);

-- Policy for all authenticated users: They should be able to see their own user record.
CREATE POLICY "RLS: Users can see own entry in church_users_v2"
ON public.church_users_v2
FOR SELECT
USING (user_id = auth.uid());


-- 3. Create new, non-recursive policies for 'churches_v2'

-- Policy for Super Admins on churches_v2
CREATE POLICY "RLS: Super Admins full access on churches_v2"
ON public.churches_v2
FOR ALL
USING (get_user_role(auth.uid()) = 'super_admin')
WITH CHECK (get_user_role(auth.uid()) = 'super_admin');

-- Policy for Church Admins on churches_v2
CREATE POLICY "RLS: Church Admins manage their own churches_v2"
ON public.churches_v2
FOR ALL
USING (
    id = get_user_church_id(auth.uid())
)
WITH CHECK (
    id = get_user_church_id(auth.uid()) AND
    get_user_role(auth.uid()) = 'church_admin'
);

-- Additionally, public access for read-only is needed for the event page.
-- This policy allows anonymous users to read church details if they are linked to an event.
CREATE POLICY "RLS: Public read access for churches_v2"
ON public.churches_v2
FOR SELECT
USING (TRUE);


COMMIT;