package messaging

import "time"

// ─── Exchange ve Queue Sabitleri ──────────────────────────────────────────────
// Tüm exchange/queue adları burada merkezi olarak tanımlanır.
// Kod içinde string literal yazmak yerine bu sabitler kullanılır.

const (
	// ExchangeEvents — tüm uygulama olaylarının yayınlandığı ana exchange.
	// Tip: "direct" — routing key ile tam eşleşme.
	ExchangeEvents = "company_os_events"
	ExchangeDLX    = "company_os_dlx" // Dead Letter Exchange

	// Routing key'ler — hangi olayın hangi queue'ya gideceğini belirler.
	// Genel format: "alan.eylem"
	KeyNotificationCreated = "notification.created" // yeni bildirim oluşturuldu
	KeyRequestEscalated    = "request.escalated"    // talep üst kademeye iletildi
	KeyAnnouncementCreated = "announcement.created" // yeni duyuru yayınlandı

	// Queue adları — her consumer bir queue dinler.
	QueueNotifications = "company_os.notifications_v2" // bildirim consumer'ı
	QueueEscalations   = "company_os.escalations_v2"   // eskalasyon consumer'ı
	QueueAnnouncements = "company_os.announcements_v2" // duyuru consumer'ı
	QueueDLQ           = "company_os.dlq"              // dead letter queue
)

// ─── Event Tipleri ────────────────────────────────────────────────────────────

// NotificationEvent — yeni bir bildirim oluşturulduğunda kuyruğa eklenen mesaj.
// Örnek senaryo: bir görev atandığında producer bu event'i yayınlar,
// consumer ise veritabanına kaydederek kullanıcıya gösterir.
type NotificationEvent struct {
	UserID    string    `json:"user_id"` // bildirimin gönderileceği kullanıcı (UUID string)
	OrgID     string    `json:"org_id"`  // organizasyon ID (UUID string)
	Title     string    `json:"title"`   // bildirim başlığı
	Message   string    `json:"message"` // bildirim içeriği
	Type      string    `json:"type"`    // "task_assigned", "leave_approved", vb.
	RefID     string    `json:"ref_id"`  // ilgili kaydın ID'si (UUID string, boş olabilir)
	CreatedAt time.Time `json:"created_at"`
}

// EscalationEvent — bir talep zaman aşımına uğradığında kuyruğa eklenen mesaj.
// Örnek senaryo: 48 saat içinde cevaplanmayan talep yöneticiye iletilir.
type EscalationEvent struct {
	RequestID   string    `json:"request_id"`
	Title       string    `json:"title"`
	OrgID       string    `json:"org_id"`
	EscalatedAt time.Time `json:"escalated_at"`
}

// AnnouncementEvent — yeni bir duyuru yayınlandığında kuyruğa eklenen mesaj.
// Consumer: bu event'i alan tüm organizasyon üyelerine bildirim gönderir.
type AnnouncementEvent struct {
	AnnouncementID string    `json:"announcement_id"`
	Title          string    `json:"title"`
	OrgID          string    `json:"org_id"`
	AuthorID       string    `json:"author_id"`
	CreatedAt      time.Time `json:"created_at"`
}
