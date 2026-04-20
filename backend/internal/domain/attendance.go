package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type AttendanceStatus string

const (
	AttendanceStatusPresent  AttendanceStatus = "present"
	AttendanceStatusAbsent   AttendanceStatus = "absent"
	AttendanceStatusLate     AttendanceStatus = "late"
	AttendanceStatusEarlyOut AttendanceStatus = "early_out"
)

type AttendanceSource string

const (
	AttendanceSourceBiometric AttendanceSource = "biometric"
	AttendanceSourceManual    AttendanceSource = "manual"
)

type Attendance struct {
	ID             uuid.UUID        `json:"id"`
	OrganizationID uuid.UUID        `json:"organization_id"`
	UserID         uuid.UUID        `json:"user_id"`
	User           *User            `json:"user,omitempty"`
	CheckInAt      *time.Time       `json:"check_in_at"`
	CheckOutAt     *time.Time       `json:"check_out_at"`
	Status         AttendanceStatus `json:"status"`
	Source         AttendanceSource `json:"source"`
	CreatedAt      time.Time        `json:"created_at"`
	UpdatedAt      time.Time        `json:"updated_at"`
}

type AttendanceAuditLog struct {
	ID             uuid.UUID `json:"id"`
	OrganizationID uuid.UUID `json:"organization_id"`
	AttendanceID   uuid.UUID `json:"attendance_id"`
	ChangedBy      uuid.UUID `json:"changed_by"`
	ChangedByUser  *User     `json:"changed_by_user,omitempty"`
	OldValue       string    `json:"old_value"` // JSON string
	NewValue       string    `json:"new_value"` // JSON string
	Reason         string    `json:"reason"`
	CreatedAt      time.Time `json:"created_at"`
}

type UserLeaveBalance struct {
	ID             uuid.UUID `json:"id"`
	OrganizationID uuid.UUID `json:"organization_id"`
	UserID         uuid.UUID `json:"user_id"`
	LeaveType      string    `json:"leave_type"`
	BalanceDays    float64   `json:"balance_days"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type AttendanceRepository interface {
	Create(ctx context.Context, att *Attendance) error
	GetByID(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*Attendance, error)
	GetByUserAndDate(ctx context.Context, userID uuid.UUID, orgID uuid.UUID, date time.Time) (*Attendance, error)
	ListByOrganization(ctx context.Context, orgID uuid.UUID, date time.Time) ([]*Attendance, error)
	Update(ctx context.Context, att *Attendance, orgID uuid.UUID) error

	// Audit Logging
	CreateAuditLog(ctx context.Context, log *AttendanceAuditLog) error
	ListAuditLogs(ctx context.Context, attendanceID uuid.UUID, orgID uuid.UUID) ([]*AttendanceAuditLog, error)

	// Leave Balance
	GetLeaveBalance(ctx context.Context, userID, orgID uuid.UUID, leaveType string) (*UserLeaveBalance, error)
	UpdateLeaveBalance(ctx context.Context, userID, orgID uuid.UUID, leaveType string, amount float64) error
}
