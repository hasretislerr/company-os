CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    creator_id UUID NOT NULL REFERENCES users(id),
    department VARCHAR(100) NOT NULL,
    role_name VARCHAR(100),
    problem_type VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open',
    is_escalated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_requests_org ON requests(organization_id);
CREATE INDEX idx_requests_creator ON requests(creator_id);
CREATE INDEX idx_requests_department ON requests(department);
