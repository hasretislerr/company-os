-- Add chat_message_deletions table for "Delete for me" feature
CREATE TABLE IF NOT EXISTS chat_message_deletions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, message_id)
);

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_chat_message_deletions_user ON chat_message_deletions(user_id);
