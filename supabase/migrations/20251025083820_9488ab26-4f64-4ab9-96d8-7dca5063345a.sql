-- Fix RLS for user_roles table - only admins/system can manage roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Only system can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only system can update roles"
  ON public.user_roles FOR UPDATE
  USING (false);

CREATE POLICY "Only system can delete roles"
  ON public.user_roles FOR DELETE
  USING (false);