package search

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"time"

	"github.com/elastic/go-elasticsearch/v8"
)

// Elasticsearch — go-elasticsearch kütüphanesi sarmalayıcısı.
type Elasticsearch struct {
	Client *elasticsearch.TypedClient // Typed API sunan v8 istemcisi (daha güvenli ve modern API)
	url    string
}

// NewElasticsearch — yeni bir Elasticsearch bağlantısı kurar ve döner.
// url: config'den gelen URL (örn: http://localhost:9201)
func NewElasticsearch(urlStr string) (*Elasticsearch, error) {
	cfg := elasticsearch.Config{
		Addresses:  []string{urlStr},
		MaxRetries: 5,
	}

	parsedUrl, err := url.Parse(urlStr)
	if err == nil && parsedUrl.User != nil {
		cfg.Username = parsedUrl.User.Username()
		cfg.Password, _ = parsedUrl.User.Password()
		// Strip credentials from the URL for cleaner logs/client config
		parsedUrl.User = nil
		cfg.Addresses = []string{parsedUrl.String()}
	}

	// Elasticsearch v8 TypedClient oluşturulur
	// Typed API, JSON'ları elle map'lemek yerine type-safe struct'lar kullanmamızı sağlar.
	client, err := elasticsearch.NewTypedClient(cfg)
	if err != nil {
		return nil, fmt.Errorf("elasticsearch client oluşturulamadı: %w", err)
	}

	// Bağlantı doğrulama (Health Check)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Info isteği atarak ES cluster'ına ulaşabiliyor muyuz kontrol et
	res, err := client.Info().Do(ctx)
	if err != nil {
		return nil, fmt.Errorf("elasticsearch ping atılamadı (bağlantı hatası): %w", err)
	}

	log.Printf("✅ Elasticsearch bağlantısı başarılı [Cluster: %s]", res.ClusterName)

	return &Elasticsearch{
		Client: client,
		url:    urlStr,
	}, nil
}
