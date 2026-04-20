package service

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type LeaveRequestService struct {
	repo domain.LeaveRequestRepository
}

func NewLeaveRequestService(repo domain.LeaveRequestRepository) *LeaveRequestService {
	return &LeaveRequestService{repo: repo}
}

func (s *LeaveRequestService) CreateLeaveRequest(ctx context.Context, userID, orgID uuid.UUID, reqType string, startDate, endDate time.Time, reason string) (*domain.LeaveRequest, error) {
	if endDate.Before(startDate) {
		return nil, errors.New("end date cannot be before start date")
	}

	req := &domain.LeaveRequest{
		ID:             uuid.New(),
		UserID:         userID,
		OrganizationID: orgID,
		Type:           reqType,
		StartDate:      startDate,
		EndDate:        endDate,
		Status:         domain.LeaveRequestStatusPending,
		ManagerStatus:  domain.LeaveRequestStatusPending,
		HRStatus:       domain.LeaveRequestStatusPending,
		Reason:         reason,
	}

	if err := s.repo.Create(ctx, req); err != nil {
		return nil, err
	}

	return req, nil
}

func (s *LeaveRequestService) ListByOrganization(ctx context.Context, orgID uuid.UUID) ([]*domain.LeaveRequest, error) {
	return s.repo.ListByOrganization(ctx, orgID)
}

func (s *LeaveRequestService) ListByUser(ctx context.Context, userID uuid.UUID, orgID uuid.UUID) ([]*domain.LeaveRequest, error) {
	return s.repo.ListByUser(ctx, userID, orgID)
}

func (s *LeaveRequestService) UpdateStatus(ctx context.Context, id uuid.UUID, orgID uuid.UUID, status domain.LeaveRequestStatus, rejectionReason string) error {
	current, err := s.repo.GetByID(ctx, id, orgID)
	if err != nil {
		return err
	}

	if current.Status != domain.LeaveRequestStatusPending {
		// Example rule: cannot change status if already finalized (optional, keeping flexible for now)
		// return errors.New("cannot change status of finalized request")
	}

	return s.repo.UpdateStatus(ctx, id, orgID, status, rejectionReason)
}

// ListPendingForManager returns requests pending manager approval
func (s *LeaveRequestService) ListPendingForManager(ctx context.Context, orgID uuid.UUID, department string) ([]*domain.LeaveRequest, error) {
	return s.repo.ListPendingForManager(ctx, orgID, department)
}

// ListPendingForHR returns requests pending HR approval
func (s *LeaveRequestService) ListPendingForHR(ctx context.Context, orgID uuid.UUID) ([]*domain.LeaveRequest, error) {
	return s.repo.ListPendingForHR(ctx, orgID)
}

// UpdateManagerStatus updates manager approval status
func (s *LeaveRequestService) UpdateManagerStatus(ctx context.Context, id uuid.UUID, orgID uuid.UUID, status domain.LeaveRequestStatus, approvedBy uuid.UUID, rejectionReason string) error {
	return s.repo.UpdateManagerStatus(ctx, id, orgID, status, approvedBy, rejectionReason)
}

// UpdateHRStatus updates HR approval status and final status
func (s *LeaveRequestService) UpdateHRStatus(ctx context.Context, id uuid.UUID, orgID uuid.UUID, status domain.LeaveRequestStatus, approvedBy uuid.UUID, rejectionReason string) error {
	return s.repo.UpdateHRStatus(ctx, id, orgID, status, approvedBy, rejectionReason)
}
