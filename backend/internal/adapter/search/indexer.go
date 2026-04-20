package search

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

// Indexer — veri tabanındaki modelleri Elasticsearch'e kaydetme işlemlerinden sorumlu.
type Indexer struct {
	es *Elasticsearch
}

// NewIndexer — yeni bir Indexer oluşturur.
func NewIndexer(es *Elasticsearch) *Indexer {
	return &Indexer{
		es: es,
	}
}

// TaskDocument — Elasticsearch'te tutulacak Task formatı
type TaskDocument struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Status      string     `json:"status"` // priority veya board bilgisi buraya eklenebilir
	WorkspaceID string     `json:"workspace_id,omitempty"`
	ProjectID   string     `json:"project_id,omitempty"`
	OrgID       string     `json:"org_id"` // Güvenlik filtresi için zorunlu
	AssigneeID  string     `json:"assignee_id,omitempty"`
	DueDate     *time.Time `json:"due_date,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

// IndexTask — bir domain.Task objesini Elasticsearch'e kaydeder veya günceller (upsert).
func (i *Indexer) IndexTask(ctx context.Context, task *domain.Task, orgID uuid.UUID) error {
	if i.es == nil || i.es.Client == nil {
		return nil // ES aktif değilse sessizce geç
	}

	var assigneeID string
	if task.AssigneeID != nil {
		assigneeID = task.AssigneeID.String()
	}

	doc := TaskDocument{
		ID:          task.ID.String(),
		Title:       task.Title,
		Description: task.Description,
		Status:      task.Priority,
		OrgID:       orgID.String(),
		AssigneeID:  assigneeID,
		DueDate:     task.DueDate,
		CreatedAt:   task.CreatedAt,
	}

	// JSON'a çevir
	payload, err := json.Marshal(doc)
	if err != nil {
		return fmt.Errorf("task json marshal hatası: %w", err)
	}

	// Index("tasks").Id("uuid").Request() ile Upsert işlemi
	_, err = i.es.Client.Index(IndexTasks).
		Id(doc.ID).
		Request(bytes.NewReader(payload)).
		Do(ctx)

	if err != nil {
		return fmt.Errorf("elasticsearch task indexleme hatası: %w", err)
	}

	log.Printf("🔍 ES Indexlendi [Task]: %s", doc.ID)
	return nil
}

// RemoveTask — silinen bir Task'ı Elasticsearch'ten uçurur.
func (i *Indexer) RemoveTask(ctx context.Context, taskID uuid.UUID) error {
	if i.es == nil || i.es.Client == nil {
		return nil
	}

	_, err := i.es.Client.Delete(IndexTasks, taskID.String()).Do(ctx)
	if err != nil {
		log.Printf("⚠️ ES içinden görev silinemedi: %v", err)
		return err
	}

	log.Printf("🧹 ES'den Silindi [Task]: %s", taskID)
	return nil
}

// ─── ANNOUNCEMENT INDEXING ───────────────────────────────────────────────────

type AnnouncementDocument struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	OrgID     string    `json:"org_id"`
	AuthorID  string    `json:"author_id"`
	CreatedAt time.Time `json:"created_at"`
}

func (i *Indexer) IndexAnnouncement(ctx context.Context, a *domain.Announcement) error {
	if i.es == nil || i.es.Client == nil {
		return nil
	}

	doc := AnnouncementDocument{
		ID:        a.ID.String(),
		Title:     a.Title,
		Content:   a.Content,
		OrgID:     a.OrganizationID.String(),
		AuthorID:  a.AuthorID.String(),
		CreatedAt: a.CreatedAt,
	}

	payload, err := json.Marshal(doc)
	if err != nil {
		return err
	}

	_, err = i.es.Client.Index(IndexAnnouncements).
		Id(doc.ID).
		Request(bytes.NewReader(payload)).
		Do(ctx)

	if err != nil {
		return err
	}

	log.Printf("🔍 ES Indexlendi [Announcement]: %s", doc.ID)
	return nil
}

func (i *Indexer) RemoveAnnouncement(ctx context.Context, id uuid.UUID) error {
	if i.es == nil || i.es.Client == nil {
		return nil
	}
	_, err := i.es.Client.Delete(IndexAnnouncements, id.String()).Do(ctx)
	if err == nil {
		log.Printf("🧹 ES'den Silindi [Announcement]: %s", id)
	}
	return err
}

// ─── USER INDEXING ───────────────────────────────────────────────────────────

type UserDocument struct {
	ID        string    `json:"id"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Email     string    `json:"email"`
	OrgID     string    `json:"org_id,omitempty"` // User oluşturulurken org olmayabilir
	CreatedAt time.Time `json:"created_at"`
}

func (i *Indexer) IndexUser(ctx context.Context, user *domain.User, orgID *uuid.UUID) error {
	if i.es == nil || i.es.Client == nil {
		return nil
	}

	var orgIDStr string
	if orgID != nil {
		orgIDStr = orgID.String()
	}

	doc := UserDocument{
		ID:        user.ID.String(),
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Email:     user.Email,
		OrgID:     orgIDStr,
		CreatedAt: user.CreatedAt,
	}

	payload, err := json.Marshal(doc)
	if err != nil {
		return err
	}

	_, err = i.es.Client.Index(IndexUsers).
		Id(doc.ID).
		Request(bytes.NewReader(payload)).
		Do(ctx)

	if err != nil {
		return err
	}

	log.Printf("🔍 ES Indexlendi [User]: %s", doc.ID)
	return nil
}

// ─── WORKSPACE INDEXING ──────────────────────────────────────────────────────

type WorkspaceDocument struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	OrgID       string    `json:"org_id"`
	CreatedBy   string    `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
}

func (i *Indexer) IndexWorkspace(ctx context.Context, w *domain.Workspace) error {
	if i.es == nil || i.es.Client == nil {
		return nil
	}

	doc := WorkspaceDocument{
		ID:          w.ID.String(),
		Name:        w.Name,
		Description: w.Description,
		OrgID:       w.OrganizationID.String(),
		CreatedBy:   w.CreatedBy.String(),
		CreatedAt:   w.CreatedAt,
	}

	payload, err := json.Marshal(doc)
	if err != nil {
		return err
	}

	_, err = i.es.Client.Index(IndexWorkspaces).
		Id(doc.ID).
		Request(bytes.NewReader(payload)).
		Do(ctx)

	if err != nil {
		return err
	}

	log.Printf("🔍 ES Indexlendi [Workspace]: %s", doc.ID)
	return nil
}

func (i *Indexer) RemoveWorkspace(ctx context.Context, id uuid.UUID) error {
	if i.es == nil || i.es.Client == nil {
		return nil
	}
	_, err := i.es.Client.Delete(IndexWorkspaces, id.String()).Do(ctx)
	if err == nil {
		log.Printf("🧹 ES'den Silindi [Workspace]: %s", id)
	}
	return err
}

// ─── PROJECT INDEXING ────────────────────────────────────────────────────────

type ProjectDocument struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	OrgID       string    `json:"org_id"`
	WorkspaceID string    `json:"workspace_id"`
	Status      string    `json:"status"`
	CreatedBy   string    `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
}

func (i *Indexer) IndexProject(ctx context.Context, p *domain.Project) error {
	if i.es == nil || i.es.Client == nil {
		return nil
	}

	doc := ProjectDocument{
		ID:          p.ID.String(),
		Name:        p.Name,
		Description: p.Description,
		OrgID:       p.OrganizationID.String(),
		WorkspaceID: p.WorkspaceID.String(),
		Status:      p.Status,
		CreatedBy:   p.CreatedBy.String(),
		CreatedAt:   p.CreatedAt,
	}

	payload, err := json.Marshal(doc)
	if err != nil {
		return err
	}

	_, err = i.es.Client.Index(IndexProjects).
		Id(doc.ID).
		Request(bytes.NewReader(payload)).
		Do(ctx)

	if err != nil {
		return err
	}

	log.Printf("🔍 ES Indexlendi [Project]: %s", doc.ID)
	return nil
}

func (i *Indexer) RemoveProject(ctx context.Context, id uuid.UUID) error {
	if i.es == nil || i.es.Client == nil {
		return nil
	}
	_, err := i.es.Client.Delete(IndexProjects, id.String()).Do(ctx)
	if err == nil {
		log.Printf("🧹 ES'den Silindi [Project]: %s", id)
	}
	return err
}
