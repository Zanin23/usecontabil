DROP POLICY IF EXISTS "Role plays owner update" ON public.role_plays;
DROP POLICY IF EXISTS "Role plays owner delete" ON public.role_plays;

CREATE POLICY "Role plays owner or admin update"
ON public.role_plays FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR auth.uid() = 'bccbba25-ea65-4d73-a359-d2d960041a85'::uuid)
WITH CHECK (created_by = auth.uid() OR auth.uid() = 'bccbba25-ea65-4d73-a359-d2d960041a85'::uuid);

CREATE POLICY "Role plays owner or admin delete"
ON public.role_plays FOR DELETE
TO authenticated
USING (created_by = auth.uid() OR auth.uid() = 'bccbba25-ea65-4d73-a359-d2d960041a85'::uuid);