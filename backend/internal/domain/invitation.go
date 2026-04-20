package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Invitation struct {
	ID               uuid.UUID `json:"id"`
	OrganizationID   uuid.UUID `json:"organization_id"`
	Email            string    `json:"email"`
	FirstName        string    `json:"first_name"`
	LastName         string    `json:"last_name"`
	Role             string    `json:"role"`
	Department       string    `json:"department"`
	VerificationCode string    `json:"verification_code"`
	InvitedBy        uuid.UUID `json:"invited_by"`
	CreatedAt        time.Time `json:"created_at"`
	ExpiresAt        time.Time `json:"expires_at"`
	IsVerified       bool      `json:"is_verified"`
}

type InvitationRepository interface {
	Create(ctx context.Context, inv *Invitation) error
	GetByEmailAndCode(ctx context.Context, email, code string) (*Invitation, error)
	GetByEmail(ctx context.Context, email string) (*Invitation, error)
	MarkAsVerified(ctx context.Context, id uuid.UUID) error
	ListByOrganization(ctx context.Context, orgID uuid.UUID) ([]*Invitation, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
