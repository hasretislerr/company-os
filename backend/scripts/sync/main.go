package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/adapter/repository"
	"github.com/hasret/company-os/backend/internal/adapter/search"
	"github.com/hasret/company-os/backend/internal/config"
	"github.com/hasret/company-os/backend/internal/domain"
)

func main() {
	cfg := config.Load()

	// 1. Veritabanı ve ES bağlantılarını kur
	db, err := repository.NewPostgresDB(cfg.DBUrl)
	if err != nil {
		log.Fatalf("Veritabanı bağlantı hatası: %v", err)
	}
	defer db.Close()

	es, err := search.NewElasticsearch(cfg.ElasticsearchUrl)
	if err != nil {
		log.Fatalf("Elasticsearch bağlantı hatası: %v", err)
	}

	// 2. Indexleri hazırla (SetupIndices idempotent'tir)
	ctx := context.Background()
	if err := es.SetupIndices(ctx); err != nil {
		log.Fatalf("Index hazırlama hatası: %v", err)
	}

	indexer := search.NewIndexer(es)

	fmt.Println("🔄 Tüm veriler senkronize ediliyor...")

	// 👥 1. Kullanıcılar
	syncUsers(ctx, db, indexer)

	// 📣 2. Duyurular
	syncAnnouncements(ctx, db, indexer)

	// 📋 3. Görevler
	syncTasks(ctx, db, indexer)

	fmt.Println("✨ Senkronizasyon başarıyla tamamlandı!")
}

func syncUsers(ctx context.Context, db *sql.DB, indexer *search.Indexer) {
	fmt.Println("👥 Kullanıcılar işleniyor...")
	rows, err := db.Query(`SELECT u.id, u.first_name, u.last_name, u.email, u.created_at, ou.organization_id 
	                       FROM users u 
	                       LEFT JOIN organization_users ou ON u.id = ou.user_id`)
	if err != nil {
		log.Printf("❌ Kullanıcı çekme hatası: %v", err)
		return
	}
	defer rows.Next()

	count := 0
	for rows.Next() {
		var u domain.User
		var orgIDStr sql.NullString
		err := rows.Scan(&u.ID, &u.FirstName, &u.LastName, &u.Email, &u.CreatedAt, &orgIDStr)
		if err != nil {
			log.Printf("⚠️ Kullanıcı scan hatası: %v", err)
			continue
		}

		var orgID *uuid.UUID
		if orgIDStr.Valid {
			id, _ := uuid.Parse(orgIDStr.String)
			orgID = &id
		}

		if err := indexer.IndexUser(ctx, &u, orgID); err != nil {
			log.Printf("❌ Kullanıcı index hatası [%s]: %v", u.ID, err)
		} else {
			count++
		}
	}
	fmt.Printf("✅ %d kullanıcı senkronize edildi.\n", count)
}

func syncAnnouncements(ctx context.Context, db *sql.DB, indexer *search.Indexer) {
	fmt.Println("📣 Duyurular işleniyor...")
	rows, err := db.Query("SELECT id, title, content, organization_id, author_id, created_at FROM announcements")
	if err != nil {
		log.Printf("❌ Duyuru çekme hatası: %v", err)
		return
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var a domain.Announcement
		err := rows.Scan(&a.ID, &a.Title, &a.Content, &a.OrganizationID, &a.AuthorID, &a.CreatedAt)
		if err != nil {
			log.Printf("⚠️ Duyuru scan hatası: %v", err)
			continue
		}

		if err := indexer.IndexAnnouncement(ctx, &a); err != nil {
			log.Printf("❌ Duyuru index hatası [%s]: %v", a.ID, err)
		} else {
			count++
		}
	}
	fmt.Printf("✅ %d duyuru senkronize edildi.\n", count)
}

func syncTasks(ctx context.Context, db *sql.DB, indexer *search.Indexer) {
	fmt.Println("📋 Görevler işleniyor...")
	// Görevlerin organizasyon bilgisini board üzerinden alıyoruz (Eski verilerde bu önemli)
	rows, err := db.Query(`SELECT t.id, t.title, t.description, t.priority, t.assignee_id, t.created_at, b.organization_id 
	                       FROM tasks t 
	                       JOIN boards b ON t.board_id = b.id`)
	if err != nil {
		log.Printf("❌ Görev çekme hatası: %v", err)
		return
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var t domain.Task
		var orgID uuid.UUID
		var assigneeID sql.NullString
		var createdAt time.Time
		err := rows.Scan(&t.ID, &t.Title, &t.Description, &t.Priority, &assigneeID, &createdAt, &orgID)
		if err != nil {
			log.Printf("⚠️ Görev scan hatası: %v", err)
			continue
		}

		t.CreatedAt = createdAt
		if assigneeID.Valid {
			id, _ := uuid.Parse(assigneeID.String)
			t.AssigneeID = &id
		}

		if err := indexer.IndexTask(ctx, &t, orgID); err != nil {
			log.Printf("❌ Görev index hatası [%s]: %v", t.ID, err)
		} else {
			count++
		}
	}
	fmt.Printf("✅ %d görev senkronize edildi.\n", count)
}
