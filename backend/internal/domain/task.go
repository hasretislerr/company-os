package domain

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type Task struct {
	ID             uuid.UUID  `json:"id"`
	OrganizationID uuid.UUID  `json:"organization_id"`
	BoardID        uuid.UUID  `json:"board_id"`
	ColumnID       uuid.UUID  `json:"column_id"`
	Title       string     `json:"title"`
	Description string     `json:"description,omitempty"`
	Priority    string     `json:"priority"` // low, medium, high, critical
	AssigneeID  *uuid.UUID `json:"assignee_id,omitempty"`
	Assignee    *User      `json:"assignee,omitempty"`
	DueDate     *time.Time `json:"due_date,omitempty"`
	Position    int        `json:"position"`
	CreatedBy   uuid.UUID  `json:"created_by"`
	Creator     *User      `json:"creator,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty"`
}

type TaskRepository interface {
	GetDB() *sql.DB
	Create(ctx context.Context, task *Task) error
	GetByID(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*Task, error)
	GetByBoard(ctx context.Context, boardID uuid.UUID, orgID uuid.UUID) ([]*Task, error)
	GetByColumn(ctx context.Context, columnID uuid.UUID, orgID uuid.UUID) ([]*Task, error)
	ListByUser(ctx context.Context, userID uuid.UUID, orgID uuid.UUID) ([]*Task, error)
	Update(ctx context.Context, task *Task, orgID uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error
}
