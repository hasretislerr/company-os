-- Add role and deleted_at columns to organization_members
ALTER TABLE organization_members ADD COLUMN role VARCHAR(50) DEFAULT 'member';
ALTER TABLE organization_members ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Backfill existing members to be admins
UPDATE organization_members SET role = 'admin' WHERE role IS NULL OR role = 'member';
