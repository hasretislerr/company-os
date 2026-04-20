package search

import (
	"context"
	"fmt"
	"log"

	"github.com/elastic/go-elasticsearch/v8/typedapi/indices/create"
	"github.com/elastic/go-elasticsearch/v8/typedapi/types"
)

const (
	IndexTasks         = "tasks"
	IndexAnnouncements = "announcements"
	IndexUsers         = "users"
	IndexWorkspaces    = "workspaces"
	IndexProjects      = "projects"
)

// SetupIndices — uygulama başlarken gerekli indexleri ve mapping'leri oluşturur.
// Mapping, veritabanındaki şemaya benzer, hangi alanın tam metin araması (text)
// hangisinin kesin eşleşme (keyword) olacağını tanımlarız.
func (es *Elasticsearch) SetupIndices(ctx context.Context) error {
	indices := []struct {
		name    string
		mapping *types.TypeMapping
	}{
		{
			name:    IndexTasks,
			mapping: taskMapping(),
		},
		{
			name:    IndexAnnouncements,
			mapping: announcementMapping(),
		},
		{
			name:    IndexUsers,
			mapping: userMapping(),
		},
		{
			name:    IndexWorkspaces,
			mapping: workspaceMapping(),
		},
		{
			name:    IndexProjects,
			mapping: projectMapping(),
		},
	}

	for _, idx := range indices {
		exists, err := es.Client.Indices.Exists(idx.name).IsSuccess(ctx)
		if err != nil {
			return fmt.Errorf("index var mı kontrolü hatası: %w", err)
		}

		if !exists {
			log.Printf("🔨 Yeni Elasticsearch index'i oluşturuluyor: %s", idx.name)

			// Index'i mapping ile oluştur
			_, err := es.Client.Indices.Create(idx.name).
				Request(&create.Request{
					Mappings: idx.mapping,
				}).
				Do(ctx)

			if err != nil {
				return fmt.Errorf("index oluşturma hatası [%s]: %w", idx.name, err)
			}
			log.Printf("✅ Index hazır: %s", idx.name)
		} else {
			log.Printf("ℹ️ Index zaten mevcut: %s", idx.name)
		}
	}

	return nil
}

// taskMapping — tasks index'inin mapping ayarları.
func taskMapping() *types.TypeMapping {
	turkish := "turkish"
	return &types.TypeMapping{
		Properties: map[string]types.Property{
			"id":           types.NewKeywordProperty(),
			"title":        &types.TextProperty{Analyzer: &turkish},
			"description":  &types.TextProperty{Analyzer: &turkish},
			"org_id":       types.NewKeywordProperty(), // Multi-tenancy filtresi
			"status":       types.NewKeywordProperty(),
			"workspace_id": types.NewKeywordProperty(),
			"project_id":   types.NewKeywordProperty(),
			"assignee_id":  types.NewKeywordProperty(),
			"due_date":     types.NewDateProperty(),
			"created_at":   types.NewDateProperty(),
		},
	}
}

// announcementMapping — duyurular index'i ayarları
func announcementMapping() *types.TypeMapping {
	turkish := "turkish"
	return &types.TypeMapping{
		Properties: map[string]types.Property{
			"id":         types.NewKeywordProperty(),
			"title":      &types.TextProperty{Analyzer: &turkish},
			"content":    &types.TextProperty{Analyzer: &turkish},
			"org_id":     types.NewKeywordProperty(),
			"author_id":  types.NewKeywordProperty(),
			"created_at": types.NewDateProperty(),
		},
	}
}

// userMapping — kullanıcılar index'i ayarları
func userMapping() *types.TypeMapping {
	turkish := "turkish"
	return &types.TypeMapping{
		Properties: map[string]types.Property{
			"id":         types.NewKeywordProperty(),
			"first_name": &types.TextProperty{Analyzer: &turkish},
			"last_name":  &types.TextProperty{Analyzer: &turkish},
			"email":      types.NewKeywordProperty(),
			"org_id":     types.NewKeywordProperty(),
			"created_at": types.NewDateProperty(),
		},
	}
}

// workspaceMapping — çalışma alanları index'i ayarları
func workspaceMapping() *types.TypeMapping {
	turkish := "turkish"
	return &types.TypeMapping{
		Properties: map[string]types.Property{
			"id":          types.NewKeywordProperty(),
			"name":        &types.TextProperty{Analyzer: &turkish},
			"description": &types.TextProperty{Analyzer: &turkish},
			"org_id":      types.NewKeywordProperty(),
			"created_by":  types.NewKeywordProperty(),
			"created_at":  types.NewDateProperty(),
		},
	}
}

// projectMapping — projeler index'i ayarları
func projectMapping() *types.TypeMapping {
	turkish := "turkish"
	return &types.TypeMapping{
		Properties: map[string]types.Property{
			"id":           types.NewKeywordProperty(),
			"name":         &types.TextProperty{Analyzer: &turkish},
			"description":  &types.TextProperty{Analyzer: &turkish},
			"org_id":       types.NewKeywordProperty(),
			"workspace_id": types.NewKeywordProperty(),
			"status":       types.NewKeywordProperty(),
			"created_by":   types.NewKeywordProperty(),
			"created_at":   types.NewDateProperty(),
		},
	}
}
