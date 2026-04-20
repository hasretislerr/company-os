package search

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/elastic/go-elasticsearch/v8/esapi"
	"github.com/google/uuid"
)

// Searcher — dışarıdan (API üzerinden) gelen arama taleplerini Elasticsearch'te çalıştırır.
type Searcher struct {
	es *Elasticsearch
}

// NewSearcher — yeni bir searcher objesi oluşturur.
func NewSearcher(es *Elasticsearch) *Searcher {
	return &Searcher{
		es: es,
	}
}

// SearchItem — Arama sonucunda dönecek jenerik öğe yapısı.
type SearchItem struct {
	Index string                 `json:"index"` // tasks, announcements, users
	ID    string                 `json:"id"`
	Score float64                `json:"score"`
	Data  map[string]interface{} `json:"data"` // Arama sonucundaki _source verisi
}

// GlobalSearch — verilen anahtar kelimeyi (query) belirtilen organizasyon için arar.
func (s *Searcher) GlobalSearch(ctx context.Context, query string, orgID uuid.UUID) ([]SearchItem, error) {
	if s.es == nil || s.es.Client == nil {
		return nil, fmt.Errorf("elasticsearch bağlantısı aktif değil")
	}

	// Güvenlik ve geçerlilik kontrolü
	query = strings.TrimSpace(query)
	if query == "" {
		return []SearchItem{}, nil
	}

	// bool query kullanarak hem multi_match hem de org_id filtresi uyguluyoruz.
	searchQuery := map[string]interface{}{
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"must": map[string]interface{}{
					"multi_match": map[string]interface{}{
						"query":     query,
						"fields":    []string{"title^3", "name^3", "description", "content", "first_name^2", "last_name^2"},
						"fuzziness": "AUTO",
						"type":      "best_fields",
					},
				},
				"filter": map[string]interface{}{
					"term": map[string]interface{}{
						"org_id": orgID.String(),
					},
				},
			},
		},
		"size": 30, // Increased size for more results across categories
	}

	searchBody, _ := json.Marshal(searchQuery)
	log.Printf("📡 ES Sorgusu: %s", string(searchBody))

	indices := []string{IndexTasks, IndexAnnouncements, IndexUsers, IndexWorkspaces, IndexProjects}

	// v8 esapi kullanarak raw request oluşturuyoruz (çünkü typed api dinamik multi-match için çok fazla struct gerektirir)
	req := esapi.SearchRequest{
		Index: indices,
		Body:  strings.NewReader(string(searchBody)),
	}

	res, err := req.Do(ctx, s.es.Client.Transport)
	if err != nil {
		return nil, fmt.Errorf("arama isteği gönderilemedi: %w", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		return nil, fmt.Errorf("arama işlemi başarısız: %s", res.String())
	}

	// Yanıtı parse et
	var result map[string]interface{}
	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("arama yanıtı okunamadı: %w", err)
	}

	// Debug: Ham yanıtı görelim
	resJSON, _ := json.Marshal(result)
	log.Printf("📥 ES Yanıtı: %s", string(resJSON))

	// Hits (sonuçları) çıkart
	// Elasticsearch dönen formatı:
	// {"hits": {"hits": [ {"_index": "...", "_id": "...", "_score": 1.0, "_source": {...}} ]}}
	items := make([]SearchItem, 0)
	hitsObj, ok := result["hits"].(map[string]interface{})
	if !ok {
		return items, nil
	}

	hitsList, ok := hitsObj["hits"].([]interface{})
	if !ok {
		return items, nil
	}

	for i, hitData := range hitsList {
		hit, ok := hitData.(map[string]interface{})
		if !ok {
			log.Printf("⚠️ Hit #%d cast edilemedi", i)
			continue
		}

		indexName, _ := hit["_index"].(string)
		idName, _ := hit["_id"].(string)
		score, _ := hit["_score"].(float64)
		source, _ := hit["_source"].(map[string]interface{})

		log.Printf("🔍 Hit bulundu: Index=%s, ID=%s, Score=%f", indexName, idName, score)

		items = append(items, SearchItem{
			Index: indexName,
			ID:    idName,
			Score: score,
			Data:  source,
		})
	}

	return items, nil
}
