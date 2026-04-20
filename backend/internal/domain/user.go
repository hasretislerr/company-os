package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	PhoneNumber  string    `json:"phone_number"`
	Bio          string    `json:"bio"`
	AvatarURL    string    `json:"avatar_url"`
	Theme        string    `json:"theme"`
	EmailNotif   bool      `json:"email_notifications"`
	PushNotif    bool      `json:"push_notifications"`
	ActivitySum  bool      `json:"activity_summary"`
	Role         string    `json:"role,omitempty"` // populated from organization_members
	Department   string     `json:"department,omitempty"`
	LastSeen     *time.Time `json:"last_seen,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`

	UpdatedAt time.Time `json:"updated_at"`
}

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id uuid.UUID) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	Update(ctx context.Context, user *User) error
	UpdatePassword(ctx context.Context, userID uuid.UUID, passwordHash string) error
	ListAll(ctx context.Context, orgID uuid.UUID) ([]*User, error)
	ListByOrganization(ctx context.Context, orgID uuid.UUID) ([]*User, error)
	UpdateLastSeen(ctx context.Context, userID uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID) error
}
