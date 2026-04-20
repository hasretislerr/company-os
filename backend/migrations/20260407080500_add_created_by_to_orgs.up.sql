-- Migration: Add created_by to organizations
-- Resolves the 'column o.created_by does not exist' error

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
