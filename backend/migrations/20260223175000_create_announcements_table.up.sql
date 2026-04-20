-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    author_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_type VARCHAR(50) DEFAULT 'all', -- 'all' (all company) or 'department'
    target_department VARCHAR(100), -- Only used if target_type is 'department'
    priority VARCHAR(50) DEFAULT 'normal', -- 'normal', 'high'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_announcements_org ON announcements(organization_id);
CREATE INDEX idx_announcements_dept ON announcements(target_department) WHERE target_type = 'department';
