package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Meeting struct {
	ID             uuid.UUID            `json:"id"`
	OrganizationID uuid.UUID            `json:"organization_id"`
	CreatorID      uuid.UUID            `json:"creator_id"`
	Title          string               `json:"title"`
	Description    string               `json:"description"`
	StartTime      time.Time            `json:"start_time"`
	EndTime        *time.Time           `json:"end_time,omitempty"`
	CreatedAt      time.Time            `json:"created_at"`
	UpdatedAt      time.Time            `json:"updated_at"`
	Participants   []MeetingParticipant `json:"participants,omitempty"`
}

type MeetingParticipant struct {
	MeetingID uuid.UUID `json:"meeting_id"`
	UserID    uuid.UUID `json:"user_id"`
	User      *User     `json:"user,omitempty"`
	Status    string    `json:"status"` // 'invited', 'accepted', 'declined'
	JoinedAt  time.Time `json:"joined_at"`
}

type MeetingRepository interface {
	Create(ctx context.Context, meeting *Meeting) error
	GetByID(ctx context.Context, id uuid.UUID) (*Meeting, error)
	ListByOrganization(ctx context.Context, orgID uuid.UUID) ([]*Meeting, error)
	Delete(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error
	AddParticipant(ctx context.Context, meetingID, userID uuid.UUID) error
	UpdateParticipantStatus(ctx context.Context, meetingID, userID uuid.UUID, status string) error
}
