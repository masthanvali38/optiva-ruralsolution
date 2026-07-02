
DROP POLICY IF EXISTS "Authenticated users can upload issue images" ON storage.objects;
CREATE POLICY "Users can upload own issue images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='issue-images' AND (storage.foldername(name))[1] = auth.uid()::text);
