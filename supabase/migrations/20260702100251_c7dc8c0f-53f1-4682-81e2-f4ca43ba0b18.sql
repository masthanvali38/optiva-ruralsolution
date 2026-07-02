
CREATE POLICY "Users can update own issue images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='issue-images' AND owner=auth.uid()) WITH CHECK (bucket_id='issue-images' AND owner=auth.uid());
CREATE POLICY "Users can delete own issue images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='issue-images' AND owner=auth.uid());
