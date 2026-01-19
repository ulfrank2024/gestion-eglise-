-- Fichier: server/db/add_event_stats_rpc.sql

-- Cette fonction calculera le nombre d'inscrits et de check-ins pour un ensemble d'événements.
-- Elle est conçue pour être appelée depuis le backend Node.js (via Supabase RPC)
-- afin de contourner les problèmes potentiels de cache de PostgREST ou de complexité RLS pour les agrégations.

CREATE OR REPLACE FUNCTION get_event_attendee_and_checkin_counts(
    p_event_ids UUID[],
    p_church_id UUID
)
RETURNS TABLE (
    event_id UUID,
    attendee_count BIGINT,
    checkin_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Exécuter la fonction avec les privilèges de son créateur (typiquement le rôle service_role),
                 -- ce qui lui permet de contourner le RLS interne pour les tables sous-jacentes.
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id AS event_id,
        (SELECT COUNT(a.id) FROM public.attendees_v2 a WHERE a.event_id = e.id AND a.church_id = p_church_id) AS attendee_count,
        e.checkin_count AS checkin_count
    FROM
        public.events_v2 e
    WHERE
        e.id = ANY(p_event_ids) AND e.church_id = p_church_id;
END;
$$;

-- Grant usage to authenticated role if needed, or other roles that will call this function.
-- In Supabase, typically the 'anon' and 'authenticated' roles have execute permissions on functions by default.
-- If the RPC is called from the backend with the service_role key, it won't need explicit grants here.

-- Optionally, if we want a function to simply count ALL attendees for an event, we could also do:
CREATE OR REPLACE FUNCTION get_event_attendee_count(p_event_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count BIGINT;
BEGIN
    SELECT COUNT(id) INTO v_count
    FROM public.attendees_v2
    WHERE event_id = p_event_id;
    
    RETURN v_count;
END;
$$;
