-- Sync profiles.email when auth.users email changes (fixes profile lookup for admin invites)
CREATE OR REPLACE FUNCTION public.sync_profile_email_on_auth_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
    SET email = NEW.email, updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email_on_auth_update();

-- Service-role only: resolve auth user id from email when profiles row is missing/out of sync
CREATE OR REPLACE FUNCTION public.resolve_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id
  FROM auth.users
  WHERE lower(trim(email)) = lower(trim(_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_user_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_user_id_by_email(text) TO service_role;

-- Helper: current user is owner of a server (by server_id text)
CREATE OR REPLACE FUNCTION public.is_server_owner(_server_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.servers s
    INNER JOIN public.profiles p ON p.id = auth.uid()
    WHERE s.server_id = _server_id
      AND lower(trim(COALESCE(s.owner_email, ''))) = lower(trim(p.email))
  );
$$;

REVOKE ALL ON FUNCTION public.is_server_owner(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_server_owner(text) TO authenticated;

-- server_admins: owners can see/manage rows for their servers (not only their own row)
CREATE POLICY "Server owners can select server admins on owned servers"
  ON public.server_admins FOR SELECT
  USING (public.is_server_owner(server_id));

CREATE POLICY "Server owners can insert server admins on owned servers"
  ON public.server_admins FOR INSERT
  WITH CHECK (public.is_server_owner(server_id));

CREATE POLICY "Server owners can update server admins on owned servers"
  ON public.server_admins FOR UPDATE
  USING (public.is_server_owner(server_id))
  WITH CHECK (public.is_server_owner(server_id));

CREATE POLICY "Server owners can delete server admins on owned servers"
  ON public.server_admins FOR DELETE
  USING (public.is_server_owner(server_id));
