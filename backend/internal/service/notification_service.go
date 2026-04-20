package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"net/smtp"
	"os"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/adapter/messaging"
	"github.com/hasret/company-os/backend/internal/domain"
)

type NotificationService struct {
	repo      domain.NotificationRepository
	userRepo  domain.UserRepository
	publisher *messaging.Publisher
}

func NewNotificationService(repo domain.NotificationRepository, userRepo domain.UserRepository, publisher *messaging.Publisher) *NotificationService {
	return &NotificationService{
		repo:      repo,
		userRepo:  userRepo,
		publisher: publisher,
	}
}

func (s *NotificationService) GetUserRepo() domain.UserRepository {
	return s.userRepo
}

func (s *NotificationService) NotifyUser(ctx context.Context, userID uuid.UUID, orgID uuid.UUID, title, message, nType string, refID *uuid.UUID) error {
	// 1. Send NotificationEvent to RabbitMQ
	var refIDStr string
	if refID != nil {
		refIDStr = refID.String()
	}

	event := messaging.NotificationEvent{
		UserID:    userID.String(),
		OrgID:     orgID.String(),
		Title:     title,
		Message:   message,
		Type:      nType,
		RefID:     refIDStr,
		CreatedAt: time.Now(),
	}

	if s.publisher != nil {
		if err := s.publisher.Publish(ctx, messaging.KeyNotificationCreated, event); err != nil {
			log.Printf("⚠️ Notification event publishing failed: %v", err)
			// Fallback to direct DB writing if RabbitMQ fails or is not connected
			return s.fallbackNotifyUserDB(ctx, userID, orgID, title, message, nType, refID)
		}
	} else {
		// No publisher configured, write directly to DB
		return s.fallbackNotifyUserDB(ctx, userID, orgID, title, message, nType, refID)
	}

	return nil
}

func (s *NotificationService) fallbackNotifyUserDB(ctx context.Context, userID uuid.UUID, orgID uuid.UUID, title, message, nType string, refID *uuid.UUID) error {
	n := &domain.Notification{
		OrganizationID: orgID,
		UserID:         userID,
		Title:          title,
		Message:        message,
		Type:           nType,
		ReferenceID:    refID,
	}
	if err := s.repo.Create(ctx, n); err != nil {
		return err
	}

	// 2. Fetch User for Email/SMS
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		log.Printf("Notification User not found: %v", userID)
		return nil // Don't fail the whole process
	}

	// 3. Simulate Email
	s.simulateEmail(user, title, message)

	// 4. Simulate SMS (if phone number exists)
	// Note: Phone number will be added to user profile in next steps
	s.simulateSMS(user, message)

	return nil
}

func (s *NotificationService) simulateEmail(user *domain.User, title, message string) {
	fmt.Printf("\n[EMAIL SIMULATION] To: %s <%s>\nSubject: %s\nBody: %s\n-------------------\n",
		user.FirstName+" "+user.LastName, user.Email, title, message)
}

func (s *NotificationService) SendEmail(to string, subject string, body string) error {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")

	if smtpHost == "" || smtpUser == "" || smtpPass == "" {
		log.Println("⚠️ SMTP credentials not fully configured. Email not sent to:", to)
		return fmt.Errorf("SMTP settings missing")
	}

	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)

	msg := []byte("To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/plain; charset=utf-8\r\n" +
		"\r\n" +
		body + "\r\n")

	go func() {
		err := smtp.SendMail(smtpHost+":"+smtpPort, auth, smtpUser, []string{to}, msg)
		if err != nil {
			log.Printf("❌ SMTP e-posta gönderim hatası (%s): %v\n", to, err)
		} else {
			log.Printf("📧 E-posta başarıyla gönderildi: %s\n", to)
		}
	}()

	return nil
}

func (s *NotificationService) simulateSMS(user *domain.User, message string) {
	// Placeholder for phone number check
	fmt.Printf("\n[SMS SIMULATION] To: UserID %s\nMessage: %s\n-------------------\n",
		user.ID, message)
}

// Higher level notification methods
func (s *NotificationService) LogBroadcastActivity(ctx context.Context, orgID uuid.UUID, title, message, nType string, refID *uuid.UUID) error {
	// Wait! We can also send this via RabbitMQ. But if we need it to just be written to the DB for all users in the org
	// This will just fall back to DB because we don't have a broadcast event yet, we will just use DB for this
	n := &domain.Notification{
		OrganizationID: orgID,
		Title:          title,
		Message:        message,
		Type:           nType,
		ReferenceID:    refID,
	}
	return s.repo.Create(ctx, n)
}

func (s *NotificationService) NotifyTaskAssigned(ctx context.Context, task *domain.Task, orgID uuid.UUID, performedBy string) error {
	// Log general activity
	activityMsg := fmt.Sprintf("%s yeni bir görev ekledi: '%s'", performedBy, task.Title)
	s.LogBroadcastActivity(ctx, orgID, "Yeni Görev", activityMsg, "task", &task.ID)

	if task.AssigneeID == nil {
		return nil
	}
	title := "Yeni Görev Atandı"
	message := fmt.Sprintf("'%s' başlıklı görev size atandı.", task.Title)
	return s.NotifyUser(ctx, *task.AssigneeID, orgID, title, message, "task", &task.ID)
}

func (s *NotificationService) LogTaskMovement(ctx context.Context, orgID uuid.UUID, taskTitle string, fromCol, toCol string, performedBy string, taskID uuid.UUID) {
	title := "Görev Hareketi"
	message := fmt.Sprintf("%s, '%s' görevini %s sütunundan %s sütununa taşıdı.", performedBy, taskTitle, fromCol, toCol)
	s.LogBroadcastActivity(ctx, orgID, title, message, "task_move", &taskID)
}

func (s *NotificationService) LogUserJoined(ctx context.Context, orgID uuid.UUID, userName string, userID uuid.UUID) {
	title := "Yeni Ekip Üyesi"
	message := fmt.Sprintf("👋 %s ekibe katıldı, hoş geldin!", userName)
	s.LogBroadcastActivity(ctx, orgID, title, message, "user_join", &userID)
}

func (s *NotificationService) NotifyMeetingCreated(ctx context.Context, meeting *domain.Meeting, userID uuid.UUID) error {
	title := "Yeni Toplantı Daveti"
	message := fmt.Sprintf("'%s' toplantısı planlandı: %s", meeting.Title, meeting.StartTime.Format("02.01.2006 15:04"))
	return s.NotifyUser(ctx, userID, meeting.OrganizationID, title, message, "meeting", &meeting.ID)
}

func (s *NotificationService) NotifyChatMessage(ctx context.Context, roomID uuid.UUID, receivers []uuid.UUID, orgID uuid.UUID, senderName string, content string) {
	title := "Yeni Mesaj"
	message := fmt.Sprintf("%s: %s", senderName, content)

	for _, userID := range receivers {
		s.NotifyUser(ctx, userID, orgID, title, message, "chat", &roomID)
	}
}
