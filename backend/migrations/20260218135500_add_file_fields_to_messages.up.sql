-- Add file fields to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS file_url TEXT;
