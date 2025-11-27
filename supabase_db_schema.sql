-- Enum type for message status
CREATE TYPE message_status AS ENUM ('WAITING', 'SENT', 'SEEN');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  status TEXT,
  profile_img_url TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  connections JSONB DEFAULT '[]'::jsonb
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  group_img_url TEXT,
  last_updated TIMESTAMP,
  last_message TEXT,
  last_updated_time TIMESTAMP,
  last_msg_sender_id VARCHAR,
  last_msg_sender_name VARCHAR
);

-- Group Members table
CREATE TABLE IF NOT EXISTS group_members (
  group_id VARCHAR REFERENCES groups(id) ON DELETE CASCADE,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  last_msg_status message_status DEFAULT 'SEEN',
  color VARCHAR,
  PRIMARY KEY (group_id, user_id)
);

-- Connections table (private user-to-user chat connections)
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  connected_user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  chat_id VARCHAR NOT NULL,
  last_msg_status message_status DEFAULT 'SEEN',
  last_message TEXT,
  last_updated TIMESTAMP,
  last_updated_time TIMESTAMP,
  last_msg_sender_id VARCHAR,
  last_msg_sender_name VARCHAR,
  UNIQUE (user_id, connected_user_id)
);

-- Chats table (optional: stores private chat metadata)
CREATE TABLE IF NOT EXISTS chats (
  id VARCHAR PRIMARY KEY,
  members JSONB -- e.g. array of user IDs or objects
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  msg TEXT NOT NULL,
  msg_status message_status DEFAULT 'SENT',
  sender_id VARCHAR REFERENCES users(id),
  sender_name VARCHAR,
  sender_profile_img TEXT,
  time TIMESTAMP NOT NULL DEFAULT now(),
  is_file BOOLEAN DEFAULT FALSE,
  file_details JSONB,
  chat_id VARCHAR,
  group_id VARCHAR,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_group_id ON messages(group_id);

-- Rooms table for WebRTC signaling
CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR PRIMARY KEY,
  on_call BOOLEAN DEFAULT TRUE,
  offer JSONB,
  answer JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- ICE Candidates table for WebRTC signaling
CREATE TABLE IF NOT EXISTS ice_candidates (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR REFERENCES rooms(id) ON DELETE CASCADE,
  candidate JSONB NOT NULL,
  type VARCHAR NOT NULL, -- 'caller' or 'callee'
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_ice_candidates_room_id ON ice_candidates(room_id);
