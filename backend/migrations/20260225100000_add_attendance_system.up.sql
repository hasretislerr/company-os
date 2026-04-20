-- Add attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    check_in_at TIMESTAMP WITH TIME ZONE,
    check_out_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'absent', -- present, absent, late, early_out
    source VARCHAR(20) NOT NULL DEFAULT 'biometric', -- biometric, manual
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add attendance audit logs table
CREATE TABLE IF NOT EXISTS attendance_audit_logs (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    attendance_id UUID NOT NULL REFERENCES attendance(id),
    changed_by UUID NOT NULL REFERENCES users(id),
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance and tenant awareness
CREATE INDEX IF NOT EXISTS idx_attendance_org_user_date ON attendance(organization_id, user_id, ((check_in_at AT TIME ZONE 'UTC')::date));
CREATE INDEX IF NOT EXISTS idx_attendance_audit_org ON attendance_audit_logs(organization_id);

-- User Leave Balances
CREATE TABLE IF NOT EXISTS user_leave_balances (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    leave_type VARCHAR(50) NOT NULL, -- Annual, Sick, etc.
    balance_days DECIMAL(5,2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id, leave_type)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_user ON user_leave_balances(user_id);
