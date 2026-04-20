package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
)

// HandlerFunc — bir mesaj geldiğinde çağrılacak fonksiyonun tipi.
// body: ham JSON verisi, hata dönerse mesaj nack (olumsuz onay) edilir.
type HandlerFunc func(ctx context.Context, body []byte) error

// Consumer — RabbitMQ'dan mesaj dinleyen yapı.
type Consumer struct {
	rmq       *RabbitMQ
	queueName string
	tag       string // consumer tag: bu consumer'ı benzersiz olarak tanımlayan isim
}

// NewConsumer — belirtilen queue üzerinde dinleyici oluşturur.
//
//   - queueName: hangi queue'yu dinleyecek (örn. "notification.events")
//   - consumerTag: birden fazla consumer varsa ayırt etmek için (örn. "notification-worker")
func NewConsumer(rmq *RabbitMQ, queueName, consumerTag string) *Consumer {
	return &Consumer{
		rmq:       rmq,
		queueName: queueName,
		tag:       consumerTag,
	}
}

// Consume — queue'yu dinlemeye başlar ve her mesaj için handler'ı çağırır.
// Bu fonksiyon bloklamaz: goroutine başlatır ve hemen döner.
//
// Mesaj akışı:
//  1. RabbitMQ mesajı "delivery" olarak gönderir
//  2. handler çağrılır
//  3. handler başarılıysa → Ack (mesaj queue'dan silinir)
//  4. handler hata verirse → Nack (mesaj queue'ya geri döner ve tekrar denenir)
func (c *Consumer) Consume(ctx context.Context, handler HandlerFunc) error {
	// channel.Consume: queue'yu abone olarak dinlemeye başlar
	// Dönen kanal üzerinden her yeni mesaj bir amqp.Delivery olarak gelir
	deliveries, err := c.rmq.channel.Consume(
		c.queueName, // hangi queue
		c.tag,       // consumer tag (yönetim arayüzünde bu isimle görünür)
		false,       // auto-ack: false → manuel onay; mesaj işlenmeden silinmez
		false,       // exclusive: sadece bu consumer mı? hayır
		false,       // no-local: aynı bağlantıdan gelen mesajları alma? hayır
		false,       // no-wait
		nil,
	)
	if err != nil {
		return fmt.Errorf("queue dinleme başlatılamadı [%s]: %w", c.queueName, err)
	}

	log.Printf("👂 Consumer başladı → queue: %s, tag: %s", c.queueName, c.tag)

	// Her mesajı ayrı bir goroutine'de işle (paralel işleme)
	go func() {
		for {
			select {
			case <-ctx.Done():
				// Context iptal edildi (uygulama kapatılıyor), döngüden çık
				log.Printf("Consumer durduruluyor → queue: %s", c.queueName)
				return

			case d, ok := <-deliveries:
				if !ok {
					// Kanal kapandı (bağlantı koptu), çık
					log.Printf("Delivery kanalı kapandı → queue: %s", c.queueName)
					return
				}

				// Handler'ı çağır
				if err := handler(ctx, d.Body); err != nil {
					log.Printf("❌ Mesaj işleme hatası [%s]: %v — mesaj dead letter queue (DLQ) yönlendiriliyor",
						c.queueName, err)
					// Nack: mesajı olumsuz onayla ve requeue=false ile DLQ'ya düşmesini sağla
					d.Nack(false, false)
				} else {
					// Ack: mesajı başarıyla işledik, queue'dan kaldır
					d.Ack(false)
				}
			}
		}
	}()

	return nil
}

// ConsumeJSON — JSON mesajları otomatik olarak belirtilen struct tipine unmarshal eder.
// Kullanım:
//
//	ConsumeJSON(ctx, func(ctx context.Context, event NotificationEvent) error {
//	    // event.UserID, event.Message vb. kullanılabilir
//	})
func ConsumeJSON[T any](ctx context.Context, c *Consumer, handler func(context.Context, T) error) error {
	return c.Consume(ctx, func(ctx context.Context, body []byte) error {
		var payload T
		if err := json.Unmarshal(body, &payload); err != nil {
			// JSON parse hatası varsa mesajı dead letter exchange'e atmak için hata dönüyoruz
			// Tüketici döngüsü nack(false, false) yapıp DLQ'ya gönderecek
			log.Printf("⚠️ JSON parse hatası: %v — mesaj DLQ'ya atılıyor", err)
			return err
		}
		return handler(ctx, payload)
	})
}
