package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
)

// Publisher — RabbitMQ'ya mesaj gönderen yapı.
// Tüm mesajlar JSON olarak encode edilir ve exchange üzerinden yayınlanır.
type Publisher struct {
	rmq      *RabbitMQ
	exchange string // hangi exchange'e publish edecek
}

// NewPublisher — belirtilen exchange'e bağlı bir Publisher oluşturur.
// exchange: mesajların yayınlanacağı exchange adı (örn. "company_os_events")
func NewPublisher(rmq *RabbitMQ, exchange string) *Publisher {
	return &Publisher{
		rmq:      rmq,
		exchange: exchange,
	}
}

// Publish — bir event'i JSON'a çevirip RabbitMQ exchange'ine gönderir.
//
// Parametreler:
//   - ctx: context (iptal/timeout senaryoları için)
//   - routingKey: mesajın hangi queue'ya gideceğini belirler (örn. "notification.created")
//   - payload: Go struct → otomatik olarak JSON'a dönüştürülür
//
// Örnek kullanım:
//
//	publisher.Publish(ctx, "notification.created", NotificationEvent{...})
func (p *Publisher) Publish(ctx context.Context, routingKey string, payload any) error {
	// Payload'ı JSON'a dönüştür
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("mesaj encode hatası: %w", err)
	}

	// amqp.Publishing: gönderilecek mesajın tüm özelliklerini tanımlar
	msg := amqp.Publishing{
		ContentType:  "application/json", // alıcı JSON beklediğini bilsin
		DeliveryMode: amqp.Persistent,    // mesaj kalıcı: sunucu yeniden başlasa bile queue'da kalır
		Body:         body,
	}

	// PublishWithContext: mesajı exchange'e gönderir
	// Exchange, routing key'e göre mesajı uygun queue'lara yönlendirir
	err = p.rmq.channel.PublishWithContext(
		ctx,
		p.exchange, // hangi exchange
		routingKey, // routing key (queue binding'deki key ile eşleşmeli)
		false,      // mandatory: eşleşen queue yoksa hata dön? hayır
		false,      // immediate: tüketici hazır değilse hata dön? hayır
		msg,
	)
	if err != nil {
		return fmt.Errorf("mesaj gönderilemedi [%s]: %w", routingKey, err)
	}

	log.Printf("📤 Mesaj gönderildi → exchange: %s, key: %s, boyut: %d byte",
		p.exchange, routingKey, len(body))
	return nil
}

// PublishDirect — exchange kullanmadan doğrudan bir queue'ya mesaj gönderir.
// RabbitMQ'nun varsayılan "" (default) exchange'ini kullanır.
// Default exchange: her queue otomatik olarak kendi adıyla bir routing key'e sahiptir.
func (p *Publisher) PublishDirect(ctx context.Context, queueName string, payload any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("mesaj encode hatası: %w", err)
	}

	err = p.rmq.channel.PublishWithContext(
		ctx,
		"",        // default exchange
		queueName, // routing key = queue adı (default exchange'de böyle çalışır)
		false,
		false,
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			Body:         body,
		},
	)
	if err != nil {
		return fmt.Errorf("direkt mesaj gönderilemedi [%s]: %w", queueName, err)
	}

	log.Printf("📤 Direkt mesaj gönderildi → queue: %s, boyut: %d byte", queueName, len(body))
	return nil
}
