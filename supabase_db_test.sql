-- Test script for database schema created for the app

-- 1. Ensure tables exist by describing them
-- Use the following command in Supabase SQL editor or psql shell
-- \d users
-- \d groups
-- \d group_members
-- \d connections
-- \d chats
-- \d messages

-- 2. Sample data inserts and verification

-- Insert sample user
INSERT INTO users (id, name, status, profile_img_url, is_online, connections)
VALUES ('user1', 'Alice', 'Hey there!', 'https://example.com/alice.jpg', true, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, name, status, profile_img_url, is_online, connections)
VALUES ('user2', 'Bob', 'Available', 'https://example.com/bob.jpg', false, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insert sample group
INSERT INTO groups (id, name, group_img_url, last_updated, last_message, last_updated_time,
                    last_msg_sender_id, last_msg_sender_name)
VALUES ('group1', 'Friends', 'https://example.com/group.jpg', CURRENT_TIMESTAMP, 'Hello group!',
        CURRENT_TIMESTAMP, 'user1', 'Alice')
ON CONFLICT (id) DO NOTHING;

-- Insert group members
INSERT INTO group_members (group_id, user_id, last_msg_status, color)
VALUES ('group1', 'user1', 'SEEN', '#ff0000'), ('group1', 'user2', 'SENT', '#00ff00')
ON CONFLICT DO NOTHING;

-- Insert chat for user1 and user2
INSERT INTO chats (id, members)
VALUES ('chat1', '[{"userId": "user1"},{"userId": "user2"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insert connections for user1 and user2
INSERT INTO connections (id, user_id, connected_user_id, chat_id, last_msg_status,
                         last_message, last_updated, last_updated_time, last_msg_sender_id, last_msg_sender_name)
VALUES
(gen_random_uuid(), 'user1', 'user2', 'chat1', 'SEEN', 'Hey Bob!', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'user1', 'Alice'),
(gen_random_uuid(), 'user2', 'user1', 'chat1', 'SEEN', 'Hey Alice!', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'user2', 'Bob')
ON CONFLICT DO NOTHING;

-- Insert messages for chat1
INSERT INTO messages (msg, msg_status, sender_id, sender_name, sender_profile_img, time, is_file, chat_id)
VALUES ('Hey Bob!', 'SENT', 'user1', 'Alice', 'https://example.com/alice.jpg', CURRENT_TIMESTAMP, false, 'chat1'),
       ('Hey Alice!', 'SEEN', 'user2', 'Bob', 'https://example.com/bob.jpg', CURRENT_TIMESTAMP, false, 'chat1')
ON CONFLICT DO NOTHING;

-- Basic queries to test retrieval

-- Fetch all users
SELECT * FROM users;

-- Fetch all groups and members
SELECT g.*, json_agg(json_build_object('user_id', gm.user_id, 'last_msg_status', gm.last_msg_status, 'color', gm.color)) AS members
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
GROUP BY g.id;

-- Fetch messages for chat1
SELECT * FROM messages WHERE chat_id = 'chat1' ORDER BY time DESC;
