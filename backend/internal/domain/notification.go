package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Notification struct {
	ID             uuid.UUID  `json:"id"`
	OrganizationID uuid.UUID  `json:"organization_id"`
	UserID         uuid.UUID  `json:"user_id"`
	Title          string     `json:"title"`
	Message        string     `json:"message"`
	Type           string     `json:"type"` // 'task', 'announcement', 'meeting'
	ReferenceID    *uuid.UUID `json:"reference_id,omitempty"`
	IsRead         bool       `json:"is_read"`
	CreatedAt      time.Time  `json:"created_at"`
}

type NotificationRepository interface {
	Create(ctx context.Context, notification *Notification) error
	ListByUser(ctx context.Context, userID uuid.UUID, orgID uuid.UUID, limit int) ([]*Notification, error)
	MarkAsRead(ctx context.Context, id uuid.UUID, userID uuid.UUID, orgID uuid.UUID) error
	MarkAllAsRead(ctx context.Context, userID uuid.UUID, orgID uuid.UUID) error
	MarkByTypeAndRef(ctx context.Context, userID uuid.UUID, orgID uuid.UUID, nType string, refID uuid.UUID) error
	MarkAllByType(ctx context.Context, userID uuid.UUID, orgID uuid.UUID, nType string) error
	GetUnreadCount(ctx context.Context, userID uuid.UUID, orgID uuid.UUID) (int, error)
	GetUnreadCountsByRef(ctx context.Context, userID uuid.UUID, orgID uuid.UUID, nType string) (map[uuid.UUID]int, error)
}
