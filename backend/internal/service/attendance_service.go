package service

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type AttendanceService struct {
	repo          domain.AttendanceRepository
	leaveRepo     domain.LeaveRequestRepository
	notifyService *NotificationService
}

func NewAttendanceService(repo domain.AttendanceRepository, leaveRepo domain.LeaveRequestRepository, notifyService *NotificationService) *AttendanceService {
	return &AttendanceService{
		repo:          repo,
		leaveRepo:     leaveRepo,
		notifyService: notifyService,
	}
}

func (s *AttendanceService) CheckIn(ctx context.Context, userID, orgID uuid.UUID, source domain.AttendanceSource) error {
	now := time.Now()

	// Check if already checked in today
	existing, err := s.repo.GetByUserAndDate(ctx, userID, orgID, now)
	if err != nil {
		return err
	}
	if existing != nil && existing.CheckInAt != nil {
		return errors.New("bugün için zaten giriş yapılmış")
	}

	status := domain.AttendanceStatusPresent
	// Basic late check: if after 09:00 AM (just an example, should be config based)
	if now.Hour() > 9 || (now.Hour() == 9 && now.Minute() > 15) {
		status = domain.AttendanceStatusLate
	}

	att := &domain.Attendance{
		ID:             uuid.New(),
		OrganizationID: orgID,
		UserID:         userID,
		CheckInAt:      &now,
		Status:         status,
		Source:         source,
	}

	return s.repo.Create(ctx, att)
}

func (s *AttendanceService) CheckOut(ctx context.Context, userID uuid.UUID, orgID uuid.UUID) error {
	now := time.Now()
	att, err := s.repo.GetByUserAndDate(ctx, userID, orgID, now)
	if err != nil {
		return err
	}
	if att == nil {
		return errors.New("giriş kaydı bulunamadı")
	}
	if att.CheckOutAt != nil {
		return errors.New("zaten çıkış yapılmış")
	}

	att.CheckOutAt = &now
	// Basic early out check: if before 05:00 PM
	if now.Hour() < 17 {
		att.Status = domain.AttendanceStatusEarlyOut
	}

	return s.repo.Update(ctx, att, orgID)
}

func (s *AttendanceService) UpdateAttendanceManual(ctx context.Context, managerID uuid.UUID, orgID uuid.UUID, attID uuid.UUID, reqBody map[string]interface{}) error {
	att, err := s.repo.GetByID(ctx, attID, orgID)
	if err != nil {
		return err
	}

	oldVal, _ := json.Marshal(att)

	// Update fields based on request
	if status, ok := reqBody["status"].(string); ok {
		att.Status = domain.AttendanceStatus(status)
	}
	if reason, ok := reqBody["reason"].(string); ok {
		// Log the change
		newVal, _ := json.Marshal(att)
		auditLog := &domain.AttendanceAuditLog{
			ID:             uuid.New(),
			OrganizationID: att.OrganizationID,
			AttendanceID:   att.ID,
			ChangedBy:      managerID,
			OldValue:       string(oldVal),
			NewValue:       string(newVal),
			Reason:         reason,
		}
		if err := s.repo.CreateAuditLog(ctx, auditLog); err != nil {
			return err
		}
	}

	att.Source = domain.AttendanceSourceManual
	return s.repo.Update(ctx, att, orgID)
}

func (s *AttendanceService) ListDailyAttendance(ctx context.Context, orgID uuid.UUID, date time.Time) ([]*domain.Attendance, error) {
	return s.repo.ListByOrganization(ctx, orgID, date)
}

func (s *AttendanceService) GetAuditLogs(ctx context.Context, attID uuid.UUID, orgID uuid.UUID) ([]*domain.AttendanceAuditLog, error) {
	return s.repo.ListAuditLogs(ctx, attID, orgID)
}
