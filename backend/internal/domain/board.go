package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Board struct {
	ID               uuid.UUID  `json:"id"`
	OrganizationID   uuid.UUID  `json:"organization_id"`
	ProjectID        uuid.UUID  `json:"project_id"`
	Name             string     `json:"name"`
	Description      string     `json:"description,omitempty"`
	Type             string     `json:"type"` // kanban, scrum
	CreatedBy        uuid.UUID  `json:"created_by"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	DeletedAt        *time.Time `json:"deleted_at,omitempty"`
	CreatorFirstName string     `json:"creator_first_name,omitempty"`
	CreatorLastName  string     `json:"creator_last_name,omitempty"`
	CreatorAvatarURL string     `json:"creator_avatar_url,omitempty"`
}

type BoardColumn struct {
	ID             uuid.UUID  `json:"id"`
	OrganizationID uuid.UUID  `json:"organization_id"`
	BoardID        uuid.UUID  `json:"board_id"`
	Name           string     `json:"name"`
	Position       int        `json:"position"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty"`
}

type BoardRepository interface {
	Create(ctx context.Context, board *Board) error
	GetByID(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*Board, error)
	GetByProject(ctx context.Context, projectID uuid.UUID, orgID uuid.UUID) ([]*Board, error)
	Update(ctx context.Context, board *Board, orgID uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error

	// Column operations
	CreateColumn(ctx context.Context, column *BoardColumn) error
	GetColumnsByBoard(ctx context.Context, boardID uuid.UUID, orgID uuid.UUID) ([]*BoardColumn, error)
	UpdateColumn(ctx context.Context, column *BoardColumn, orgID uuid.UUID) error
	DeleteColumn(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error
	GetColumnByID(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*BoardColumn, error)
}
