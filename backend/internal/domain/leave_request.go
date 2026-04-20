package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type LeaveRequestStatus string

const (
	LeaveRequestStatusPending  LeaveRequestStatus = "Pending"
	LeaveRequestStatusApproved LeaveRequestStatus = "Approved"
	LeaveRequestStatusRejected LeaveRequestStatus = "Rejected"
)

type LeaveRequest struct {
	ID              uuid.UUID          `json:"id"`
	UserID          uuid.UUID          `json:"user_id"`
	User            *User              `json:"user,omitempty"` // Populated in list queries
	OrganizationID  uuid.UUID          `json:"organization_id"`
	Type            string             `json:"type"` // e.g. "Annual", "Sick", "Remote"
	StartDate       time.Time          `json:"start_date"`
	EndDate         time.Time          `json:"end_date"`
	Status          LeaveRequestStatus `json:"status"`
	Reason          string             `json:"reason"`
	RejectionReason string             `json:"rejection_reason,omitempty"`

	// Manager Approval Stage
	ManagerStatus     LeaveRequestStatus `json:"manager_status"`
	ManagerApprovedBy *uuid.UUID         `json:"manager_approved_by,omitempty"`
	ManagerApprovedAt *time.Time         `json:"manager_approved_at,omitempty"`

	// HR Approval Stage
	HRStatus     LeaveRequestStatus `json:"hr_status"`
	HRApprovedBy *uuid.UUID         `json:"hr_approved_by,omitempty"`
	HRApprovedAt *time.Time         `json:"hr_approved_at,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type LeaveRequestRepository interface {
	Create(ctx context.Context, req *LeaveRequest) error
	GetByID(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*LeaveRequest, error)
	ListByOrganization(ctx context.Context, orgID uuid.UUID) ([]*LeaveRequest, error)
	ListByUser(ctx context.Context, userID uuid.UUID, orgID uuid.UUID) ([]*LeaveRequest, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, orgID uuid.UUID, status LeaveRequestStatus, rejectionReason string) error

	// Multi-stage approval methods
	ListPendingForManager(ctx context.Context, orgID uuid.UUID, department string) ([]*LeaveRequest, error)
	ListPendingForHR(ctx context.Context, orgID uuid.UUID) ([]*LeaveRequest, error)
	UpdateManagerStatus(ctx context.Context, id uuid.UUID, orgID uuid.UUID, status LeaveRequestStatus, approvedBy uuid.UUID, rejectionReason string) error
	UpdateHRStatus(ctx context.Context, id uuid.UUID, orgID uuid.UUID, status LeaveRequestStatus, approvedBy uuid.UUID, rejectionReason string) error
}
