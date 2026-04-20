package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type RequestStatus string

const (
	RequestStatusOpen   RequestStatus = "open"
	RequestStatusClosed RequestStatus = "closed"
)

type Request struct {
	ID             uuid.UUID     `json:"id"`
	OrganizationID uuid.UUID     `json:"organization_id"`
	CreatorID      uuid.UUID     `json:"creator_id"`
	Department     string        `json:"department"`
	RoleName       string        `json:"role_name"`
	ProblemType    string        `json:"problem_type"`
	Description    string        `json:"description"`
	Status         RequestStatus `json:"status"`
	IsEscalated    bool          `json:"is_escalated"`
	CreatedAt      time.Time     `json:"created_at"`
	UpdatedAt      time.Time     `json:"updated_at"`

	// Joins
	Creator *User `json:"creator,omitempty"`
}

type RequestRepository interface {
	Create(ctx context.Context, req *Request) error
	GetByID(ctx context.Context, id uuid.UUID) (*Request, error)
	ListByOrganization(ctx context.Context, orgID uuid.UUID, limit, offset int) ([]*Request, error)
	ListByDepartment(ctx context.Context, orgID uuid.UUID, department string, limit, offset int) ([]*Request, error)
	ListByCreator(ctx context.Context, creatorID uuid.UUID, limit, offset int) ([]*Request, error)
	GetUnescalated(ctx context.Context, olderThan time.Time) ([]*Request, error)
	ListRelevant(ctx context.Context, orgID uuid.UUID, creatorID uuid.UUID, isManager bool, isAdmin bool, userDept string, limit, offset int) ([]*Request, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status RequestStatus) error
	MarkEscalated(ctx context.Context, id uuid.UUID) error
}
