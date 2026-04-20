package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/hasret/company-os/backend/internal/domain"

	"github.com/google/uuid"
)

type requestRepository struct {
	db *sql.DB
}

func NewRequestRepository(db *sql.DB) domain.RequestRepository {
	return &requestRepository{db: db}
}

func (r *requestRepository) Create(ctx context.Context, req *domain.Request) error {
	query := `
		INSERT INTO requests (id, organization_id, creator_id, department, role_name, problem_type, description, status, is_escalated, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err := r.db.ExecContext(ctx, query,
		req.ID, req.OrganizationID, req.CreatorID, req.Department, req.RoleName, req.ProblemType, req.Description, req.Status, req.IsEscalated, req.CreatedAt, req.UpdatedAt)
	return err
}

func (r *requestRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Request, error) {
	query := `
		SELECT r.id, r.organization_id, r.creator_id, r.department, r.role_name, r.problem_type, r.description, r.status, r.is_escalated, r.created_at, r.updated_at,
		       COALESCE(u.first_name, ''), COALESCE(u.last_name, ''), COALESCE(u.email, ''), COALESCE(u.avatar_url, '')
		FROM requests r
		LEFT JOIN users u ON r.creator_id = u.id
		WHERE r.id = $1
	`
	row := r.db.QueryRowContext(ctx, query, id)
	var req domain.Request
	var user domain.User
	var fname, lname, email, avatar sql.NullString
	var roleName sql.NullString

	err := row.Scan(
		&req.ID, &req.OrganizationID, &req.CreatorID, &req.Department, &roleName, &req.ProblemType, &req.Description, &req.Status, &req.IsEscalated, &req.CreatedAt, &req.UpdatedAt,
		&fname, &lname, &email, &avatar,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // or proper error
		}
		return nil, err
	}

	if roleName.Valid {
		req.RoleName = roleName.String
	}

	if fname.Valid {
		user.ID = req.CreatorID
		user.FirstName = fname.String
		user.LastName = lname.String
		user.Email = email.String
		user.AvatarURL = avatar.String
		req.Creator = &user
	}
	return &req, nil
}

func (r *requestRepository) ListByOrganization(ctx context.Context, orgID uuid.UUID, limit, offset int) ([]*domain.Request, error) {
	query := `
		SELECT r.id, r.organization_id, r.creator_id, r.department, r.role_name, r.problem_type, r.description, r.status, r.is_escalated, r.created_at, r.updated_at,
		       u.first_name, u.last_name, u.email
		FROM requests r
		LEFT JOIN users u ON r.creator_id = u.id
		WHERE r.organization_id = $1
		ORDER BY r.created_at DESC
		LIMIT $2 OFFSET $3
	`
	return r.fetchList(ctx, query, orgID, limit, offset)
}

func (r *requestRepository) ListByDepartment(ctx context.Context, orgID uuid.UUID, department string, limit, offset int) ([]*domain.Request, error) {
	query := `
		SELECT r.id, r.organization_id, r.creator_id, r.department, r.role_name, r.problem_type, r.description, r.status, r.is_escalated, r.created_at, r.updated_at,
		       u.first_name, u.last_name, u.email
		FROM requests r
		LEFT JOIN users u ON r.creator_id = u.id
		WHERE r.organization_id = $1 AND r.department = $2
		ORDER BY r.created_at DESC
		LIMIT $3 OFFSET $4
	`
	return r.fetchList(ctx, query, orgID, department, limit, offset)
}

func (r *requestRepository) ListByCreator(ctx context.Context, creatorID uuid.UUID, limit, offset int) ([]*domain.Request, error) {
	query := `
		SELECT r.id, r.organization_id, r.creator_id, r.department, r.role_name, r.problem_type, r.description, r.status, r.is_escalated, r.created_at, r.updated_at,
		       u.first_name, u.last_name, u.email
		FROM requests r
		LEFT JOIN users u ON r.creator_id = u.id
		WHERE r.creator_id = $1
		ORDER BY r.created_at DESC
		LIMIT $2 OFFSET $3
	`
	return r.fetchList(ctx, query, creatorID, limit, offset)
}

func (r *requestRepository) GetUnescalated(ctx context.Context, olderThan time.Time) ([]*domain.Request, error) {
	query := `
		SELECT r.id, r.organization_id, r.creator_id, r.department, r.role_name, r.problem_type, r.description, r.status, r.is_escalated, r.created_at, r.updated_at,
		       u.first_name, u.last_name, u.email
		FROM requests r
		LEFT JOIN users u ON r.creator_id = u.id
		WHERE r.is_escalated = false AND r.status = 'open' AND r.created_at <= $1
	`
	return r.fetchList(ctx, query, olderThan)
}

func (r *requestRepository) ListRelevant(ctx context.Context, orgID uuid.UUID, creatorID uuid.UUID, isManager bool, isAdmin bool, userDept string, limit, offset int) ([]*domain.Request, error) {
	query := `
		SELECT r.id, r.organization_id, r.creator_id, r.department, r.role_name, r.problem_type, r.description, r.status, r.is_escalated, r.created_at, r.updated_at,
		       COALESCE(u.first_name, ''), COALESCE(u.last_name, ''), COALESCE(u.email, ''), COALESCE(u.avatar_url, '')
		FROM requests r
		LEFT JOIN users u ON r.creator_id = u.id
		WHERE r.organization_id = $1 AND (r.creator_id = $2 OR ($3 = true AND ($4 = true OR r.department = $5)))
		ORDER BY r.created_at DESC
		LIMIT $6 OFFSET $7
	`
	return r.fetchList(ctx, query, orgID, creatorID, isManager, isAdmin, userDept, limit, offset)
}

func (r *requestRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.RequestStatus) error {
	query := `UPDATE requests SET status = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, status, id)
	return err
}

func (r *requestRepository) MarkEscalated(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE requests SET is_escalated = true, updated_at = NOW() WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *requestRepository) fetchList(ctx context.Context, query string, args ...interface{}) ([]*domain.Request, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*domain.Request
	for rows.Next() {
		var req domain.Request
		var user domain.User
		var fname, lname, email, avatar sql.NullString
		var roleName sql.NullString

		err := rows.Scan(
			&req.ID, &req.OrganizationID, &req.CreatorID, &req.Department, &roleName, &req.ProblemType, &req.Description, &req.Status, &req.IsEscalated, &req.CreatedAt, &req.UpdatedAt,
			&fname, &lname, &email, &avatar,
		)
		if err != nil {
			return nil, err
		}

		if roleName.Valid {
			req.RoleName = roleName.String
		}

		if fname.Valid {
			user.ID = req.CreatorID
			user.FirstName = fname.String
			user.LastName = lname.String
			user.Email = email.String
			user.AvatarURL = avatar.String
			req.Creator = &user
		}
		results = append(results, &req)
	}
	return results, nil
}
