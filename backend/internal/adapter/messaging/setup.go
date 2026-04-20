package messaging

import (
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
)

// Setup — uygulama başladığında bir kez çağrılır.
// Exchange, queue ve binding'leri RabbitMQ üzerinde oluşturur.
// RabbitMQ bu yapıları zaten biliyorsa mevcut olanı kullanır (idempotent).
//
// Mimari görünüm:
//
//	[Producer]
//	    │
//	    ▼
//	[Exchange: company_os_events]   ← routing key'e göre yönlendirir
//	    │
//	    ├──(notification.created)──► [Queue: company_os.notifications]  ──► [Consumer: NotificationWorker]
//	    ├──(request.escalated) ───► [Queue: company_os.escalations]    ──► [Consumer: EscalationWorker]
//	    └──(announcement.created)─► [Queue: company_os.announcements]  ──► [Consumer: AnnouncementWorker]
func Setup(rmq *RabbitMQ) error {
	// 1. Ana exchange'i oluştur
	// "direct": routing key tam eşleşmesi gerekir
	// durable=true: RabbitMQ yeniden başlasa bile exchange silinmez
	if err := rmq.DeclareExchange(ExchangeEvents, "direct", true); err != nil {
		return err
	}
	log.Printf("✅ Exchange hazır: %s", ExchangeEvents)

	// DLX (Dead Letter Exchange) ve DLQ (Dead Letter Queue) oluştur
	if err := rmq.DeclareExchange(ExchangeDLX, "fanout", true); err != nil {
		return err
	}
	log.Printf("✅ DLX hazır: %s", ExchangeDLX)

	if _, err := rmq.DeclareQueue(QueueDLQ, true, false, nil); err != nil {
		return err
	}
	log.Printf("✅ DLQ hazır: %s", QueueDLQ)

	// DLQ'yu DLX'e bağla
	if err := rmq.BindQueue(QueueDLQ, "", ExchangeDLX); err != nil {
		return err
	}

	// 2. Queue'ları oluştur

	queues := []string{
		QueueNotifications,
		QueueEscalations,
		QueueAnnouncements,
	}

	args := amqp.Table{
		"x-dead-letter-exchange": ExchangeDLX,
	}

	for _, q := range queues {
		if _, err := rmq.DeclareQueue(q, true, false, args); err != nil {
			return err
		}
		log.Printf("✅ Queue hazır (DLX destekli): %s", q)
	}

	// 3. Queue'ları exchange'e bağla (binding)
	// Her binding: "bu routing key ile gelen mesajı bu queue'ya yönlendir" demek
	bindings := []struct {
		queue      string
		routingKey string
	}{
		{QueueNotifications, KeyNotificationCreated},
		{QueueEscalations, KeyRequestEscalated},
		{QueueAnnouncements, KeyAnnouncementCreated},
	}

	for _, b := range bindings {
		if err := rmq.BindQueue(b.queue, b.routingKey, ExchangeEvents); err != nil {
			return err
		}
		log.Printf("✅ Binding: %s → %s", b.routingKey, b.queue)
	}

	return nil
}
