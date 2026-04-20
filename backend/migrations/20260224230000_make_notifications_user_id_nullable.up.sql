-- Make user_id nullable in notifications table for broadcast activities
ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL;
