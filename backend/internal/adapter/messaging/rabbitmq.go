package messaging

import (
	"fmt"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// RabbitMQ — bağlantı ve kanal yöneticisi.
// Bağlantı koparsa otomatik olarak yeniden bağlanır (reconnect).
type RabbitMQ struct {
	conn    *amqp.Connection // TCP bağlantısı (bir süreç içinde tek olmalı)
	channel *amqp.Channel    // Mesaj gönderme/alma kanalı (her işlem bir kanal üzerinden)
	url     string           // amqp://kullanici:sifre@host:port/vhost
}

// NewRabbitMQ — bağlantıyı kurar ve hazır bir RabbitMQ nesnesi döner.
// url örneği: "amqp://guest:guest@localhost:5672/"
func NewRabbitMQ(url string) (*RabbitMQ, error) {
	rmq := &RabbitMQ{url: url}

	if err := rmq.connect(); err != nil {
		return nil, err
	}

	// Bağlantı kopma sinyalini arka planda dinle ve otomatik yeniden bağlan.
	go rmq.reconnectLoop()

	return rmq, nil
}

// connect — gerçek TCP bağlantısını ve kanalı açar.
func (r *RabbitMQ) connect() error {
	var err error

	// amqp.Dial: AMQP 0-9-1 protokolüyle TCP bağlantısı kurar.
	r.conn, err = amqp.Dial(r.url)
	if err != nil {
		return fmt.Errorf("rabbitmq bağlantısı kurulamadı: %w", err)
	}

	// Channel: tek bir conn üzerinde çok sayıda sanal kanal açılabilir.
	// Her goroutine kendi kanalını kullanmalı; biz burada tek kanal tutuyoruz.
	r.channel, err = r.conn.Channel()
	if err != nil {
		return fmt.Errorf("rabbitmq kanal açılamadı: %w", err)
	}

	log.Println("✅ RabbitMQ bağlantısı kuruldu")
	return nil
}

// reconnectLoop — bağlantı kapandığında otomatik olarak yeniden bağlanmayı dener.
// amqp.Connection.NotifyClose(), bağlantı koptuğunda kanal üzerinden sinyal gönderir.
func (r *RabbitMQ) reconnectLoop() {
	for {
		// NotifyClose: bağlantı kapandığında bu kanala bir amqp.Error gönderilir.
		reason, ok := <-r.conn.NotifyClose(make(chan *amqp.Error))
		if !ok {
			// ok=false → bağlantı temiz kapatıldı (Close() çağrıldı), döngüden çık.
			log.Println("RabbitMQ bağlantısı temiz kapatıldı")
			return
		}
		log.Printf("⚠️ RabbitMQ bağlantısı koptu (%s), yeniden bağlanılıyor...", reason)

		// Bağlantı yeniden kurulana kadar 5 saniye aralıklarla dene.
		for {
			time.Sleep(5 * time.Second)
			if err := r.connect(); err != nil {
				log.Printf("Yeniden bağlantı başarısız: %v, tekrar denenecek...", err)
				continue
			}
			break // Başarılı bağlantı
		}
	}
}

// Channel — dışarıdan kanal erişimi (publisher ve consumer bunun üzerinden çalışır).
func (r *RabbitMQ) Channel() *amqp.Channel {
	return r.channel
}

// Close — bağlantıyı ve kanalı düzgünce kapatır; uygulama kapanırken çağrılmalı.
func (r *RabbitMQ) Close() {
	if r.channel != nil {
		r.channel.Close()
	}
	if r.conn != nil {
		r.conn.Close()
	}
}

// DeclareQueue — bir queue yoksa oluşturur, varsa var olanı kullanır.
// Bu fonksiyon idempotent'tir: defalarca çağrılabilir, aynı queue döner.
//
// Parametreler:
//   - name: queue adı (örn. "notifications", "escalations")
//   - durable: sunucu yeniden başladığında queue hayatta kalır mı?
//   - autoDelete: bütün consumer'lar ayrılınca queue otomatik silinsin mi?
func (r *RabbitMQ) DeclareQueue(name string, durable bool, autoDelete bool, args amqp.Table) (amqp.Queue, error) {
	return r.channel.QueueDeclare(
		name,       // queue adı
		durable,    // sunucu yeniden başlasa bile queue yaşasın
		autoDelete, // consumer kalmayınca sil
		false,      // exclusive: sadece bu bağlantıya özel mi? hayır
		false,      // no-wait: sunucunun cevabını bekle
		args,       // ek argümanlar (TTL, dead letter exchange vb. buraya girer)
	)
}

// DeclareExchange — bir exchange yoksa oluşturur.
// Exchange: mesajların routing (yönlendirme) mantığını belirler.
//
// Exchange tipleri:
//   - "direct"  → routing key ile tam eşleşme (biz bunu kullanacağız)
//   - "fanout"  → tüm bağlı queue'lara gönder (broadcast)
//   - "topic"   → pattern matching ile yönlendir (örn. "user.*")
//   - "headers" → mesaj başlıklarına göre yönlendir
func (r *RabbitMQ) DeclareExchange(name, kind string, durable bool) error {
	return r.channel.ExchangeDeclare(
		name,    // exchange adı
		kind,    // tip: "direct", "fanout", "topic", "headers"
		durable, // kalıcı mı?
		false,   // auto-delete
		false,   // internal (sadece exchange→exchange routing için)
		false,   // no-wait
		nil,
	)
}

// BindQueue — bir queue'yu exchange'e bağlar.
// routingKey: hangi mesajların bu queue'ya geldiğini belirler.
func (r *RabbitMQ) BindQueue(queueName, routingKey, exchangeName string) error {
	return r.channel.QueueBind(
		queueName,    // queue
		routingKey,   // mesajın routing key'i bu ise queue'ya düşür
		exchangeName, // hangi exchange'den dinle
		false,        // no-wait
		nil,
	)
}
