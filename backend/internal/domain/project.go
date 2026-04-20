package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Project struct {
	ID               uuid.UUID  `json:"id"`
	OrganizationID   uuid.UUID  `json:"organization_id"`
	WorkspaceID      uuid.UUID  `json:"workspace_id"`
	Name             string     `json:"name"`
	Description      string     `json:"description,omitempty"`
	Status           string     `json:"status"` // active, completed, archived
	CreatedBy        uuid.UUID  `json:"created_by"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	DeletedAt        *time.Time `json:"deleted_at,omitempty"`
	CreatorFirstName string     `json:"creator_first_name,omitempty"`
	CreatorLastName  string     `json:"creator_last_name,omitempty"`
	CreatorAvatarURL string     `json:"creator_avatar_url,omitempty"`
}

type ProjectRepository interface {
	Create(ctx context.Context, project *Project) error
	GetByID(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*Project, error)
	GetByOrganization(ctx context.Context, orgID uuid.UUID) ([]*Project, error)
	GetByWorkspace(ctx context.Context, workspaceID uuid.UUID, orgID uuid.UUID) ([]*Project, error)
	Update(ctx context.Context, project *Project, orgID uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error
}
