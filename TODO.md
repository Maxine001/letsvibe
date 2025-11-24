# TODO - Fix real-time subscription errors with Supabase

## TopProfileView.tsx
- Remove Firebase imports: doc, onSnapshot
- Import Supabase DB from src/supabase/Supabase.js
- Fetch user is_online status via Supabase query on mount
- Subscribe to user's is_online status changes using Supabase realtime channel
- Update component state with user online status
- Cleanup subscription on unmount

## Chat.tsx
- Refactor real-time subscription to use Supabase realtime channel API
- Subscribe to 'messages' table INSERT events with .on('postgres_changes')
- On new message event, update messages state avoiding duplicates
- Properly unsubscribe on component unmount

## Testing
- Validate that real-time user online status updates correctly in TopProfileView
- Validate chat messages real-time updates in Chat screen
- Ensure no Firebase related errors in console
