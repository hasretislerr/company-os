-- Add department to organization_members table
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'unassigned';
