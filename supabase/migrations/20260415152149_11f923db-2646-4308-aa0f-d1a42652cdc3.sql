
-- Fix permissive INSERT policy on notifications
DROP POLICY "Authenticated can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Fix storage listing - restrict to authenticated only
DROP POLICY "Anyone can view issue images" ON storage.objects;
CREATE POLICY "Authenticated can view issue images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'issue-images');
