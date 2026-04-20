package repository

import (
	"context"
	"database/sql"

	"github.com/hasret/company-os/backend/internal/domain"
	"github.com/lib/pq"

	"github.com/google/uuid"
)

type announcementRepository struct {
	db *sql.DB
}

func NewAnnouncementRepository(db *sql.DB) domain.AnnouncementRepository {
	return &announcementRepository{db: db}
}

func (r *announcementRepository) Create(ctx context.Context, a *domain.Announcement) error {
	query := `
		INSERT INTO announcements (organization_id, author_id, title, content, target_type, target_departments, target_roles, priority)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		a.OrganizationID, a.AuthorID, a.Title, a.Content, a.TargetType, pq.Array(a.TargetDepartments), pq.Array(a.TargetRoles), a.Priority,
	).Scan(&a.ID, &a.CreatedAt, &a.UpdatedAt)

	return err
}

func (r *announcementRepository) GetByOrganization(ctx context.Context, orgID uuid.UUID, userID uuid.UUID, userDept string, userRole string) ([]*domain.Announcement, error) {
	query := `
		SELECT a.id, a.organization_id, a.author_id, a.title, a.content, a.target_type, a.target_departments, a.target_roles, a.priority, a.created_at, a.updated_at,
		       u.first_name || ' ' || u.last_name as author_name,
		       COALESCE(u.avatar_url, '') as author_avatar_url
		FROM announcements a
		JOIN users u ON a.author_id = u.id
		WHERE a.organization_id = $1 
		  AND a.deleted_at IS NULL
		  AND (
			  $4 = 'admin'      -- Admin sees everything
			  OR a.author_id = $2 -- Author sees their own
			  OR a.target_type = 'all' 
			  OR ($3 = ANY(a.target_departments)) 
			  OR ($4 = ANY(a.target_roles))
		  )
		ORDER BY a.priority DESC, a.created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, orgID, userID, userDept, userRole)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	announcements := make([]*domain.Announcement, 0)
	for rows.Next() {
		a := &domain.Announcement{}
		err := rows.Scan(
			&a.ID, &a.OrganizationID, &a.AuthorID, &a.Title, &a.Content, &a.TargetType,
			(*pq.StringArray)(&a.TargetDepartments), (*pq.StringArray)(&a.TargetRoles), &a.Priority, &a.CreatedAt, &a.UpdatedAt,
			&a.AuthorName,
			&a.AuthorAvatarURL,
		)
		if err != nil {
			return nil, err
		}
		if a.TargetDepartments == nil {
			a.TargetDepartments = []string{}
		}
		if a.TargetRoles == nil {
			a.TargetRoles = []string{}
		}
		announcements = append(announcements, a)
	}

	return announcements, nil
}

func (r *announcementRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE announcements SET deleted_at = NOW() WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}
