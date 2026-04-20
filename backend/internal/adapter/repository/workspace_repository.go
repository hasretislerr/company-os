package repository

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type PostgresWorkspaceRepository struct {
	db *sql.DB
}

func NewPostgresWorkspaceRepository(db *sql.DB) *PostgresWorkspaceRepository {
	return &PostgresWorkspaceRepository{db: db}
}

func (r *PostgresWorkspaceRepository) Create(ctx context.Context, workspace *domain.Workspace) error {
	query := `
		INSERT INTO workspaces (id, organization_id, name, description, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
	`
	_, err := r.db.ExecContext(ctx, query,
		workspace.ID,
		workspace.OrganizationID,
		workspace.Name,
		workspace.Description,
		workspace.CreatedBy,
	)
	return err
}

func (r *PostgresWorkspaceRepository) GetByID(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*domain.Workspace, error) {
	query := `
		SELECT w.id, w.organization_id, w.name, w.description, w.created_by, w.created_at, w.updated_at, w.deleted_at,
		       u.first_name, u.last_name, u.avatar_url
		FROM workspaces w
		LEFT JOIN users u ON w.created_by = u.id
		WHERE w.id = $1 AND w.organization_id = $2 AND w.deleted_at IS NULL
	`
	workspace := &domain.Workspace{}
	err := r.db.QueryRowContext(ctx, query, id, orgID).Scan(
		&workspace.ID,
		&workspace.OrganizationID,
		&workspace.Name,
		&workspace.Description,
		&workspace.CreatedBy,
		&workspace.CreatedAt,
		&workspace.UpdatedAt,
		&workspace.DeletedAt,
		&workspace.CreatorFirstName,
		&workspace.CreatorLastName,
		&workspace.CreatorAvatarURL,
	)
	if err != nil {
		return nil, err
	}
	return workspace, nil
}

func (r *PostgresWorkspaceRepository) GetByOrganization(ctx context.Context, orgID uuid.UUID) ([]*domain.Workspace, error) {
	query := `
		SELECT w.id, w.organization_id, w.name, w.description, w.created_by, w.created_at, w.updated_at, w.deleted_at,
		       u.first_name, u.last_name, u.avatar_url
		FROM workspaces w
		LEFT JOIN users u ON w.created_by = u.id
		WHERE w.organization_id = $1 AND w.deleted_at IS NULL
		ORDER BY w.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	workspaces := make([]*domain.Workspace, 0)
	for rows.Next() {
		workspace := &domain.Workspace{}
		err := rows.Scan(
			&workspace.ID,
			&workspace.OrganizationID,
			&workspace.Name,
			&workspace.Description,
			&workspace.CreatedBy,
			&workspace.CreatedAt,
			&workspace.UpdatedAt,
			&workspace.DeletedAt,
			&workspace.CreatorFirstName,
			&workspace.CreatorLastName,
			&workspace.CreatorAvatarURL,
		)
		if err != nil {
			return nil, err
		}
		workspaces = append(workspaces, workspace)
	}
	return workspaces, nil
}

func (r *PostgresWorkspaceRepository) Update(ctx context.Context, workspace *domain.Workspace, orgID uuid.UUID) error {
	query := `
		UPDATE workspaces
		SET name = $1, description = $2, updated_at = NOW()
		WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL
	`
	_, err := r.db.ExecContext(ctx, query,
		workspace.Name,
		workspace.Description,
		workspace.ID,
		orgID,
	)
	return err
}

func (r *PostgresWorkspaceRepository) Delete(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error {
	query := `UPDATE workspaces SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2`
	_, err := r.db.ExecContext(ctx, query, id, orgID)
	return err
}
