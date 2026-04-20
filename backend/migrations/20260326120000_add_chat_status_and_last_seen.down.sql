-- Remove last_seen from users
ALTER TABLE users DROP COLUMN last_seen;

-- Remove status from chat_messages
ALTER TABLE chat_messages DROP COLUMN status;
