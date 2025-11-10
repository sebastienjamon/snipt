# Supabase Storage Setup for Profile Pictures

To enable profile picture uploads, you need to create a storage bucket in Supabase:

## Steps:

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Create a bucket with the following settings:
   - **Name**: `avatars`
   - **Public bucket**: ✅ Enabled (so profile pictures are publicly accessible)
   - **File size limit**: 2MB (recommended)
   - **Allowed MIME types**: image/* (optional, for additional security)

5. Click **Create bucket**

## Storage Policies (Optional but Recommended):

After creating the bucket, you can set up RLS policies:

### Upload Policy:
```sql
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Read Policy (Public):
```sql
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

### Delete Policy:
```sql
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

## Note:
The settings page will automatically handle the upload and update the user's metadata with the avatar URL.
