-- Add status to chat_messages
ALTER TABLE chat_messages ADD COLUMN status VARCHAR(20) DEFAULT 'sent';

-- Add last_seen to users
ALTER TABLE users ADD COLUMN last_seen TIMESTAMP;
