package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Workspace struct {
	ID               uuid.UUID  `json:"id"`
	OrganizationID   uuid.UUID  `json:"organization_id"`
	Name             string     `json:"name"`
	Description      string     `json:"description,omitempty"`
	CreatedBy        uuid.UUID  `json:"created_by"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	DeletedAt        *time.Time `json:"deleted_at,omitempty"`
	CreatorFirstName string     `json:"creator_first_name,omitempty"`
	CreatorLastName  string     `json:"creator_last_name,omitempty"`
	CreatorAvatarURL string     `json:"creator_avatar_url,omitempty"`
}

type WorkspaceRepository interface {
	Create(ctx context.Context, workspace *Workspace) error
	GetByID(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*Workspace, error)
	GetByOrganization(ctx context.Context, orgID uuid.UUID) ([]*Workspace, error)
	Update(ctx context.Context, workspace *Workspace, orgID uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error
}
