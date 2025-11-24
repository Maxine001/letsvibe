# Supabase Storage Bucket Setup and Environment Variable Verification

This document provides guidance on verifying and correcting the Supabase storage bucket configuration for this project to resolve the "Bucket not found" error.

---

## Background

The project uses Supabase Storage to store user profile images. The name of the storage bucket is configured by the environment variable `VITE_SUPABASE_STORAGE_BUCKET`.

If this environment variable is not set or does not point to an existing bucket, the app will raise an error:  
`StorageApiError: Bucket not found`.

---

## Steps to Verify and Fix

### 1. Check Environment Variable

- Open the `.env` file in the project root or verify environment variables in your deployment environment.
- Check if the variable `VITE_SUPABASE_STORAGE_BUCKET` is set.
- If not set, the project defaults to `public`. You can either create a bucket named `public` in Supabase or set the variable to an existing bucket's name.

Example `.env` setting:

```
VITE_SUPABASE_STORAGE_BUCKET=your-bucket-name
```

### 2. Verify Bucket Existence in Supabase

- Login to your Supabase project dashboard.
- Navigate to **Storage** > **Buckets**.
- Confirm that the bucket named in `VITE_SUPABASE_STORAGE_BUCKET` exists.
- If it does not exist, create the bucket with the given name.

### 3. Restart Development Server

- After making changes to `.env`, restart your development server to apply new environment variables.

### 4. Optional - Debug Storage Bucket

- The project logs the currently configured storage bucket on startup. Check your console output for the line:

```
Current Supabase STORAGE_BUCKET: your-bucket-name
```

- This helps confirm that the app is using the expected bucket name.

---

## Summary

Fixing the "Bucket not found" error involves:

- Correctly setting `VITE_SUPABASE_STORAGE_BUCKET`.
- Ensuring the corresponding bucket exists in Supabase.
- Restarting the application to apply changes.

---

## Additional Setup: Row Level Security (RLS) Policies for the Users Table

If you encounter errors like "new row violates row-level security policy" during user insertion, it means your 'users' table has RLS enabled but lacks the necessary policies for allowing insert operations.

### How to Fix RLS Policy Issues

1. Enable Row Level Security (if not already enabled):

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

2. Create appropriate policies to allow inserting and selecting users, for example:

```sql
CREATE POLICY "Allow all users to select users"
ON users
FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated users to insert"
ON users
FOR INSERT
TO authenticated
WITH CHECK (true);
```

3. Apply these policies in the Supabase SQL editor or using the CLI.

4. For more detailed information, refer to the Supabase documentation on [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security).

By configuring RLS policies correctly, you will allow your application to insert new users and avoid row-level security violations.

---

If you need assistance updating environment variables, Supabase configuration, or the database policies, consult the official Supabase documentation or your project maintainer.
