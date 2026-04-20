ALTER TABLE leave_requests 
DROP COLUMN IF EXISTS manager_status,
DROP COLUMN IF EXISTS manager_approved_by,
DROP COLUMN IF EXISTS manager_approved_at,
DROP COLUMN IF EXISTS hr_status,
DROP COLUMN IF EXISTS hr_approved_by,
DROP COLUMN IF EXISTS hr_approved_at;
