package repository

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type PostgresNotificationRepository struct {
	db *sql.DB
}

func NewPostgresNotificationRepository(db *sql.DB) *PostgresNotificationRepository {
	return &PostgresNotificationRepository{db: db}
}

func (r *PostgresNotificationRepository) Create(ctx context.Context, n *domain.Notification) error {
	query := `
		INSERT INTO notifications (
			organization_id, user_id, title, message, type, reference_id
		) VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`
	err := r.db.QueryRowContext(
		ctx, query,
		n.OrganizationID, n.UserID, n.Title, n.Message, n.Type, n.ReferenceID,
	).Scan(&n.ID, &n.CreatedAt)
	if err != nil {
		// If UserID is nil, try without it (for broadcast)
		queryNoUser := `
			INSERT INTO notifications (
				organization_id, title, message, type, reference_id
			) VALUES ($1, $2, $3, $4, $5)
			RETURNING id, created_at
		`
		err = r.db.QueryRowContext(
			ctx, queryNoUser,
			n.OrganizationID, n.Title, n.Message, n.Type, n.ReferenceID,
		).Scan(&n.ID, &n.CreatedAt)
	}
	return err
}

func (r *PostgresNotificationRepository) ListByUser(ctx context.Context, userID uuid.UUID, orgID uuid.UUID, limit int) ([]*domain.Notification, error) {
	query := `
		SELECT id, organization_id, user_id, title, message, type, reference_id, is_read, created_at
		FROM notifications
		WHERE organization_id = $1
		AND (user_id = $2 OR user_id IS NULL)
		ORDER BY created_at DESC
		LIMIT $3
	`
	rows, err := r.db.QueryContext(ctx, query, orgID, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	notifications := make([]*domain.Notification, 0)
	for rows.Next() {
		n := &domain.Notification{}
		err := rows.Scan(
			&n.ID, &n.OrganizationID, &n.UserID, &n.Title, &n.Message, &n.Type, &n.ReferenceID, &n.IsRead, &n.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		notifications = append(notifications, n)
	}
	return notifications, nil
}

func (r *PostgresNotificationRepository) MarkAsRead(ctx context.Context, id uuid.UUID, userID uuid.UUID, orgID uuid.UUID) error {
	query := `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) AND organization_id = $3`
	_, err := r.db.ExecContext(ctx, query, id, userID, orgID)
	return err
}

func (r *PostgresNotificationRepository) MarkAllAsRead(ctx context.Context, userID uuid.UUID, orgID uuid.UUID) error {
	query := `UPDATE notifications SET is_read = TRUE WHERE (user_id = $1 OR user_id IS NULL) AND organization_id = $2`
	_, err := r.db.ExecContext(ctx, query, userID, orgID)
	return err
}

func (r *PostgresNotificationRepository) MarkByTypeAndRef(ctx context.Context, userID uuid.UUID, orgID uuid.UUID, nType string, refID uuid.UUID) error {
	query := `UPDATE notifications SET is_read = TRUE WHERE (user_id = $1 OR user_id IS NULL) AND organization_id = $2 AND type = $3 AND reference_id = $4`
	_, err := r.db.ExecContext(ctx, query, userID, orgID, nType, refID)
	return err
}

func (r *PostgresNotificationRepository) MarkAllByType(ctx context.Context, userID uuid.UUID, orgID uuid.UUID, nType string) error {
	query := `UPDATE notifications SET is_read = TRUE WHERE (user_id = $1 OR user_id IS NULL) AND organization_id = $2 AND type = $3`
	_, err := r.db.ExecContext(ctx, query, userID, orgID, nType)
	return err
}

func (r *PostgresNotificationRepository) GetUnreadCountsByRef(ctx context.Context, userID uuid.UUID, orgID uuid.UUID, nType string) (map[uuid.UUID]int, error) {
	query := `
		SELECT reference_id, COUNT(*) 
		FROM notifications 
		WHERE (user_id = $1 OR user_id IS NULL) AND organization_id = $2 AND type = $3 AND is_read = FALSE AND reference_id IS NOT NULL
		GROUP BY reference_id
	`
	rows, err := r.db.QueryContext(ctx, query, userID, orgID, nType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[uuid.UUID]int)
	for rows.Next() {
		var refID uuid.UUID
		var count int
		if err := rows.Scan(&refID, &count); err != nil {
			return nil, err
		}
		counts[refID] = count
	}
	return counts, nil
}

func (r *PostgresNotificationRepository) GetUnreadCount(ctx context.Context, userID uuid.UUID, orgID uuid.UUID) (int, error) {
	query := `SELECT COUNT(*) FROM notifications WHERE (user_id = $1 OR user_id IS NULL) AND organization_id = $2 AND is_read = FALSE`
	var count int
	err := r.db.QueryRowContext(ctx, query, userID, orgID).Scan(&count)
	return count, err
}
