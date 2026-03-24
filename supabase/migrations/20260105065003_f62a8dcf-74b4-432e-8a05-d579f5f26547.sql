-- Create storage bucket for steam shots videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('steam-shots', 'steam-shots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload videos to their chef folder
CREATE POLICY "Chefs can upload steam shots"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'steam-shots' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow chefs to update their own videos
CREATE POLICY "Chefs can update own steam shots"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'steam-shots' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow chefs to delete their own videos
CREATE POLICY "Chefs can delete own steam shots"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'steam-shots' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public viewing of steam shot videos
CREATE POLICY "Anyone can view steam shots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'steam-shots');