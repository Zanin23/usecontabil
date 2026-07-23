
ALTER TABLE public.role_plays
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

-- enforce allowed values
ALTER TABLE public.role_plays DROP CONSTRAINT IF EXISTS role_plays_visibility_check;
ALTER TABLE public.role_plays
  ADD CONSTRAINT role_plays_visibility_check CHECK (visibility IN ('public','private'));

CREATE INDEX IF NOT EXISTS role_plays_created_by_idx ON public.role_plays(created_by);

-- replace public read policy: anyone can read public published; owners can read their own
DROP POLICY IF EXISTS "Role plays public read" ON public.role_plays;

CREATE POLICY "Role plays read public or owned"
  ON public.role_plays
  FOR SELECT
  USING (
    (is_published = true AND visibility = 'public')
    OR (auth.uid() IS NOT NULL AND created_by = auth.uid())
  );

CREATE POLICY "Role plays owner insert"
  ON public.role_plays
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Role plays owner update"
  ON public.role_plays
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Role plays owner delete"
  ON public.role_plays
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
