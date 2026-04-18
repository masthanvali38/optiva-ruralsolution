-- Allow workers to claim accepted tasks and update status on their own tasks
DROP POLICY IF EXISTS "NGOs can update issues they manage" ON public.issues;

CREATE POLICY "Authorized users can update issues"
ON public.issues
FOR UPDATE
TO authenticated
USING (
  auth.uid() = reported_by
  OR auth.uid() = assigned_ngo
  OR auth.uid() = assigned_worker
  OR public.has_role(auth.uid(), 'ngo'::app_role)
  OR (
    public.has_role(auth.uid(), 'worker'::app_role)
    AND assigned_worker IS NULL
    AND status = 'accepted'::issue_status
  )
)
WITH CHECK (
  auth.uid() = reported_by
  OR auth.uid() = assigned_ngo
  OR auth.uid() = assigned_worker
  OR public.has_role(auth.uid(), 'ngo'::app_role)
  OR (
    public.has_role(auth.uid(), 'worker'::app_role)
    AND assigned_worker = auth.uid()
  )
);