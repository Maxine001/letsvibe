# TODO: Display Last Messages Beneath User and Group Lists

## Tasks
- [x] Add state `userLastMsgs` in `ChatsList.tsx` to store last message data for users
- [x] Create `fetchUserLastMsgs` function in `ChatsList.tsx` to fetch latest messages from messages table
- [x] Call `fetchUserLastMsgs` in `useEffect` after users are set
- [x] Update ProfileBar props for users to use fetched last message data if no connection exists
- [x] Update ProfileBar.tsx to use `text-xs` for last message text and add "No messages yet" placeholder
- [x] Fix database column name from `created_at` to `time` in fetchUserLastMsgs query
- [x] Add state `groupLastMsgs` in `ChatsList.tsx` to store last message data for groups
- [x] Create `fetchGroupLastMsgs` function in `ChatsList.tsx` to fetch latest messages from messages table for groups
- [x] Call `fetchGroupLastMsgs` in `useEffect` after groups are set
- [x] Update ProfileBar props for groups to use fetched last message data from messages table
- [x] Update Chat.tsx to populate groups table with last message data when messages are sent
- [x] Create SQL script to update existing groups with last message data
