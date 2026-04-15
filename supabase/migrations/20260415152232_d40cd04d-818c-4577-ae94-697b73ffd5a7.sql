
UPDATE storage.buckets SET public = true WHERE id = 'issue-images';
DROP POLICY IF EXISTS "Authenticated can view issue images" ON storage.objects;
CREATE POLICY "Public can view issue images by path" ON storage.objects FOR SELECT USING (bucket_id = 'issue-images' AND (storage.foldername(name))[1] IS NOT NULL);
