package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type CalendarEventType string

const (
	EventTypeTask    CalendarEventType = "task"
	EventTypeMeeting CalendarEventType = "meeting"
	EventTypeLeave   CalendarEventType = "leave"
)

type CalendarEvent struct {
	ID          string            `json:"id"`
	Title       string            `json:"title"`
	Description string            `json:"description,omitempty"`
	Type        CalendarEventType `json:"type"` // "task", "meeting", "leave"
	StartDate   time.Time         `json:"start_date"`
	EndDate     *time.Time        `json:"end_date,omitempty"`
	Status      string            `json:"status"` // e.g., "pending", "approved", "todo", "done"
	Color       string            `json:"color,omitempty"`
	RefID       uuid.UUID         `json:"ref_id"`
}

type CalendarService interface {
	GetEvents(ctx context.Context, orgID, userID uuid.UUID, start, end time.Time) ([]*CalendarEvent, error)
}
