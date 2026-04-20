package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Announcement struct {
	ID                uuid.UUID  `json:"id"`
	OrganizationID    uuid.UUID  `json:"organization_id"`
	AuthorID          uuid.UUID  `json:"author_id"`
	AuthorName        string     `json:"author_name"`       // Joined field
	AuthorAvatarURL   string     `json:"author_avatar_url"` // Joined field
	Title             string     `json:"title"`
	Content           string     `json:"content"`
	TargetType        string     `json:"target_type"`        // "all", "department", "role", "multiple"
	TargetDepartments []string   `json:"target_departments"` // multiple selection
	TargetRoles       []string   `json:"target_roles"`       // multiple selection
	Priority          string     `json:"priority"`           // "normal", "high"
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	DeletedAt         *time.Time `json:"deleted_at,omitempty"`
}

type AnnouncementRepository interface {
	Create(ctx context.Context, announcement *Announcement) error
	GetByOrganization(ctx context.Context, orgID uuid.UUID, userID uuid.UUID, userDept string, userRole string) ([]*Announcement, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
