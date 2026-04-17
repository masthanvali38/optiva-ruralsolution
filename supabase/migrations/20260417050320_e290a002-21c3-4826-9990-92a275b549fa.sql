-- Allow NGOs to delete issues
CREATE POLICY "NGOs can delete issues"
ON public.issues
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'ngo'::app_role));

-- Allow cascade delete of issue_history when an issue is deleted
CREATE POLICY "NGOs can delete issue history"
ON public.issue_history
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'ngo'::app_role));