# TODO: Implement Unread Messages Count and Highlight

## Tasks
- [x] Modify ChatsList.tsx to fetch unread message counts for groups and users
- [x] Update ProfileBar.tsx to display unread count badge and highlight last message if unread
- [ ] Test the implementation

## Details
- For groups: Fetch count of messages where group_id = group.id, sender_id != currentUser.id, msg_status != SEEN
- For users: Fetch count of messages where chat_id = chatId, sender_id != currentUser.id, msg_status != SEEN
- Display unread count as a badge in ProfileBar if > 0
- Highlight last message text (bold or different color) if lastMsgStatus is SENT (unread)

## Implementation Summary
- Added unreadCounts state in ChatsList.tsx to store counts for each chat/group
- Created fetchUnreadCounts function to query database for unread messages
- Passed unreadCount prop to ProfileBar components
- Updated ProfileBar to display unread count badge next to name
- Highlighted last message text when unread (status SENT) by making it bold and lighter color
