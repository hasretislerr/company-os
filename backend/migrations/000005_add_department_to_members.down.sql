-- Remove department from organization_members table
ALTER TABLE organization_members DROP COLUMN IF EXISTS department;
