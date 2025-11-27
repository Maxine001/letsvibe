# Migration Plan: Fix Firebase Error and Migrate WebRTC Signaling to Supabase

## Tasks
- [x] Add 'rooms' and 'ice_candidates' tables to supabase_db_schema.sql
- [x] Update RLS policies in supabase_rls_policies.sql for new tables
- [x] Replace Firebase Firestore operations in src/Components/Utils.ts with Supabase database queries and Realtime subscriptions
- [x] Replace Firebase Firestore operations in src/Screens/Call.tsx with Supabase equivalents
- [x] Remove Firebase dependencies from package.json
- [ ] Test the migration to ensure WebRTC calls work with Supabase
