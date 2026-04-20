ALTER TABLE leave_requests 
ADD COLUMN manager_status VARCHAR(20) DEFAULT 'Pending',
ADD COLUMN manager_approved_by UUID REFERENCES users(id),
ADD COLUMN manager_approved_at TIMESTAMPTZ,
ADD COLUMN hr_status VARCHAR(20) DEFAULT 'Pending',
ADD COLUMN hr_approved_by UUID REFERENCES users(id),
ADD COLUMN hr_approved_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX idx_leave_requests_manager_status ON leave_requests(manager_status);
CREATE INDEX idx_leave_requests_hr_status ON leave_requests(hr_status);
