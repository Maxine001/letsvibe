# TODO: Fix Private Messages Visibility Issue

## Problem
- Personal messages sent from localhost user to netlify user are not visible to the netlify user.
- Group messages work fine.

## Root Cause
- For private chats, the chat_id was set to the receiver's id, but the receiver filters on sender's id, causing mismatch.
- Connections were not updated for both users when sending private messages.

## Solution
- Use deterministic chatId for private chats: sorted ids joined by '-'.
- Update connections for both sender and receiver after sending private messages.

## Changes Made

### 1. ChatsList.tsx
- [x] Changed private chat chatId to deterministic: [currentUser.id, u.id].sort().join('-')
- [x] Unified the ProfileBar rendering for all users, using the deterministic chatId.

### 2. Chat.tsx
- [x] Fixed insert chat members for private: members: [senderId, receiverId] instead of [senderId, chat_id]
- [x] Added update connections logic for both users after successful message insert for private chats.

### 3. ProfileBar.tsx
- [x] No changes needed, as chatId is now always provided.

## Testing
- Test sending private messages between users.
- Verify both users see the messages.
- Check connections are updated correctly.

## Followup
- Monitor for any issues with existing chats.
- If needed, migrate old connections to use deterministic chatId.
