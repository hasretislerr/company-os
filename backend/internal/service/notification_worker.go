package service

import (
	"context"
	"log"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/adapter/messaging"
	"github.com/hasret/company-os/backend/internal/domain"
)

// NotificationWorker — RabbitMQ'dan gelen bildirim event'lerini işleyen arka plan servisi.
type NotificationWorker struct {
	rmq      *messaging.RabbitMQ
	repo     domain.NotificationRepository
	userRepo domain.UserRepository
}

// NewNotificationWorker — worker nesnesini oluşturur.
func NewNotificationWorker(rmq *messaging.RabbitMQ, repo domain.NotificationRepository, userRepo domain.UserRepository) *NotificationWorker {
	return &NotificationWorker{
		rmq:      rmq,
		repo:     repo,
		userRepo: userRepo,
	}
}

// Start — RabbitMQ consumer'ını başlatır ve gelen mesajları dinlemeye başlar.
// Bu metot uygulama çalışırken arka planda sürekli çalışmalıdır.
func (w *NotificationWorker) Start(ctx context.Context) error {
	if w.rmq == nil {
		log.Println("⚠️ NotificationWorker: RabbitMQ bağlantısı yok, worker başlatılamadı.")
		return nil
	}

	consumer := messaging.NewConsumer(w.rmq, messaging.QueueNotifications, "notification-worker-1")

	// ConsumeJSON ile gelen JSON mesajları otomatik olarak NotificationEvent struct'ına çevir.
	return messaging.ConsumeJSON(ctx, consumer, w.handleNotification)
}

// handleNotification — kuyruktan gelen her bir NotificationEvent mesajı için çağrılır.
func (w *NotificationWorker) handleNotification(ctx context.Context, event messaging.NotificationEvent) error {
	log.Printf("📩 Yeni bildirim geldi [kullanıcı: %s, başlık: %s]", event.UserID, event.Title)

	// String UUID'leri parse et
	orgID, err := uuid.Parse(event.OrgID)
	if err != nil {
		log.Printf("❌ NotificationWorker: Geçersiz OrgID formatı: %s", event.OrgID)
		return nil // Nack atıp tekrar denemesi sorunu çözmez, Ack'lemek için nil dön
	}

	var userID uuid.UUID
	if event.UserID != "" { // Broadcast bildirimleri için UserID boş olabilir
		parsedID, err := uuid.Parse(event.UserID)
		if err != nil {
			log.Printf("❌ NotificationWorker: Geçersiz UserID formatı: %s", event.UserID)
			return nil
		}
		userID = parsedID
	}

	var refID *uuid.UUID
	if event.RefID != "" {
		parsedRef, err := uuid.Parse(event.RefID)
		if err == nil {
			refID = &parsedRef
		}
	}

	// 1. Veritabanına kaydet
	n := &domain.Notification{
		OrganizationID: orgID,
		UserID:         userID, // broadcast ise empty uuid
		Title:          event.Title,
		Message:        event.Message,
		Type:           event.Type,
		ReferenceID:    refID,
		CreatedAt:      event.CreatedAt,
	}

	if err := w.repo.Create(ctx, n); err != nil {
		// Hata dönersek mesaj RabbitMQ tarafından Nack edilip kuyruğa geri konur (retry)
		return err
	}

	// 2. Email/SMS simülasyonu
	if userID != uuid.Nil {
		user, err := w.userRepo.GetByID(ctx, userID)
		if err == nil {
			w.simulateEmail(user, event.Title, event.Message)
			w.simulateSMS(user, event.Message)
		}
	}

	log.Printf("✅ Bildirim işlendi ve veritabanına eklendi")
	return nil
}

func (w *NotificationWorker) simulateEmail(user *domain.User, title, message string) {
	log.Printf("[EMAIL SIMULATION] To: %s <%s> | Subject: %s | Body: %s",
		user.FirstName+" "+user.LastName, user.Email, title, message)
}

func (w *NotificationWorker) simulateSMS(user *domain.User, message string) {
	log.Printf("[SMS SIMULATION] To: UserID %s | Message: %s",
		user.ID, message)
}
