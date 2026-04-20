package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Organization struct {
	ID               uuid.UUID  `json:"id"`
	Name             string     `json:"name"`
	Slug             string     `json:"slug"`
	PlanType         string     `json:"plan_type"`
	CreatedBy        uuid.UUID  `json:"created_by"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	DeletedAt        *time.Time `json:"deleted_at,omitempty"`
	CreatorFirstName string     `json:"creator_first_name,omitempty"`
	CreatorLastName  string     `json:"creator_last_name,omitempty"`
}

type OrganizationMember struct {
	ID             uuid.UUID  `json:"id"`
	OrganizationID uuid.UUID  `json:"organization_id"`
	UserID         uuid.UUID  `json:"user_id"`
	RoleID         *uuid.UUID `json:"role_id,omitempty"`
	Role           string     `json:"role"`
	Department     string     `json:"department"`
	JoinedAt       time.Time  `json:"joined_at"`
}

type OrganizationRepository interface {
	ListAll(ctx context.Context) ([]*Organization, error)
	Create(ctx context.Context, org *Organization) error
	GetByID(ctx context.Context, id uuid.UUID) (*Organization, error)
	GetUserOrganizations(ctx context.Context, userID uuid.UUID) ([]*Organization, error)
	Update(ctx context.Context, org *Organization) error
	Delete(ctx context.Context, id uuid.UUID) error
	AddMember(ctx context.Context, member *OrganizationMember) error
	IsMember(ctx context.Context, userID, orgID uuid.UUID) (bool, error)
	GetUserRole(ctx context.Context, userID uuid.UUID, orgID uuid.UUID) (string, error)
	UpdateMemberRoleAndDepartment(ctx context.Context, orgID uuid.UUID, userID uuid.UUID, role, department string) error
	GetMembersByTarget(ctx context.Context, orgID uuid.UUID, departments []string, roles []string) ([]uuid.UUID, error)
}
