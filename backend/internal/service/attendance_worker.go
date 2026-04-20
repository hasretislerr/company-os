package service

import (
	"context"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type AttendanceWorker struct {
	attRepo   domain.AttendanceRepository
	orgRepo   domain.OrganizationRepository
	notifySvc *NotificationService
}

func NewAttendanceWorker(attRepo domain.AttendanceRepository, orgRepo domain.OrganizationRepository, notifySvc *NotificationService) *AttendanceWorker {
	return &AttendanceWorker{
		attRepo:   attRepo,
		orgRepo:   orgRepo,
		notifySvc: notifySvc,
	}
}

func (w *AttendanceWorker) Start(ctx context.Context) {
	// Run once immediately on start
	w.RunDailyCheck(ctx)

	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.RunDailyCheck(ctx)
		}
	}
}

func (w *AttendanceWorker) RunDailyCheck(ctx context.Context) {
	log.Println("[AttendanceWorker] Günlük katılım kontrolü başlatılıyor...")

	orgs, err := w.orgRepo.ListAll(ctx)
	if err != nil {
		log.Printf("Error listing orgs: %v", err)
		return
	}

	for _, org := range orgs {
		w.CheckAbsenceForOrg(ctx, org.ID)
	}
}

func (w *AttendanceWorker) CheckAbsenceForOrg(ctx context.Context, orgID uuid.UUID) {
	// 1. Get all members
	memberIDs, err := w.orgRepo.GetMembersByTarget(ctx, orgID, nil, nil)
	if err != nil {
		log.Printf("Error getting members for org %s: %v", orgID, err)
		return
	}

	today := time.Now()
	for _, userID := range memberIDs {
		// 2. Check if attendance exists
		att, err := w.attRepo.GetByUserAndDate(ctx, userID, orgID, today)
		if err != nil {
			log.Printf("Error checking attendance for user %s: %v", userID, err)
			continue
		}

		if att == nil {
			// 3. Mark as absent
			newAtt := &domain.Attendance{
				ID:             uuid.New(),
				OrganizationID: orgID,
				UserID:         userID,
				Status:         domain.AttendanceStatusAbsent,
				Source:         domain.AttendanceSourceBiometric,
			}
			if err := w.attRepo.Create(ctx, newAtt); err != nil {
				log.Printf("Error creating auto-attendance for user %s: %v", userID, err)
				continue
			}

			// 4. Notify user
			w.notifySvc.NotifyUser(ctx, userID, orgID, "Katılım Uyarısı", "Bugün işe giriş kaydınız bulunamadı. Lütfen yöneticinizle iletişime geçin.", "attendance", &newAtt.ID)

			// 5. Deduct leave balance (Automatic)
			if err := w.attRepo.UpdateLeaveBalance(ctx, userID, orgID, "Annual", -1.0); err != nil {
				log.Printf("Error updating leave balance for user %s: %v", userID, err)
			}
		}
	}
}
