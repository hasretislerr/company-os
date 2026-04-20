package repository

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type PostgresProjectRepository struct {
	db *sql.DB
}

func NewPostgresProjectRepository(db *sql.DB) *PostgresProjectRepository {
	return &PostgresProjectRepository{db: db}
}

func (r *PostgresProjectRepository) Create(ctx context.Context, project *domain.Project) error {
	query := `
		INSERT INTO projects (id, organization_id, workspace_id, name, description, status, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
	`
	_, err := r.db.ExecContext(ctx, query,
		project.ID,
		project.OrganizationID,
		project.WorkspaceID,
		project.Name,
		project.Description,
		project.Status,
		project.CreatedBy,
	)
	return err
}

func (r *PostgresProjectRepository) GetByID(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*domain.Project, error) {
	query := `
		SELECT p.id, p.organization_id, p.workspace_id, p.name, p.description, p.status, p.created_by, p.created_at, p.updated_at, p.deleted_at,
		       u.first_name, u.last_name, u.avatar_url
		FROM projects p
		LEFT JOIN users u ON p.created_by = u.id
		WHERE p.id = $1 AND p.organization_id = $2 AND p.deleted_at IS NULL
	`
	project := &domain.Project{}
	err := r.db.QueryRowContext(ctx, query, id, orgID).Scan(
		&project.ID,
		&project.OrganizationID,
		&project.WorkspaceID,
		&project.Name,
		&project.Description,
		&project.Status,
		&project.CreatedBy,
		&project.CreatedAt,
		&project.UpdatedAt,
		&project.DeletedAt,
		&project.CreatorFirstName,
		&project.CreatorLastName,
		&project.CreatorAvatarURL,
	)
	if err != nil {
		return nil, err
	}
	return project, nil
}

func (r *PostgresProjectRepository) GetByOrganization(ctx context.Context, orgID uuid.UUID) ([]*domain.Project, error) {
	query := `
		SELECT p.id, p.organization_id, p.workspace_id, p.name, p.description, p.status, p.created_by, p.created_at, p.updated_at, p.deleted_at,
		       u.first_name, u.last_name, u.avatar_url
		FROM projects p
		LEFT JOIN users u ON p.created_by = u.id
		WHERE p.organization_id = $1 AND p.deleted_at IS NULL
		ORDER BY p.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	projects := make([]*domain.Project, 0)
	for rows.Next() {
		project := &domain.Project{}
		err := rows.Scan(
			&project.ID,
			&project.OrganizationID,
			&project.WorkspaceID,
			&project.Name,
			&project.Description,
			&project.Status,
			&project.CreatedBy,
			&project.CreatedAt,
			&project.UpdatedAt,
			&project.DeletedAt,
			&project.CreatorFirstName,
			&project.CreatorLastName,
			&project.CreatorAvatarURL,
		)
		if err != nil {
			return nil, err
		}
		projects = append(projects, project)
	}
	return projects, nil
}

func (r *PostgresProjectRepository) GetByWorkspace(ctx context.Context, workspaceID uuid.UUID, orgID uuid.UUID) ([]*domain.Project, error) {
	query := `
		SELECT p.id, p.organization_id, p.workspace_id, p.name, p.description, p.status, p.created_by, p.created_at, p.updated_at, p.deleted_at,
		       u.first_name, u.last_name, u.avatar_url
		FROM projects p
		LEFT JOIN users u ON p.created_by = u.id
		WHERE p.workspace_id = $1 AND p.organization_id = $2 AND p.deleted_at IS NULL
		ORDER BY p.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, workspaceID, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	projects := make([]*domain.Project, 0)
	for rows.Next() {
		project := &domain.Project{}
		err := rows.Scan(
			&project.ID,
			&project.OrganizationID,
			&project.WorkspaceID,
			&project.Name,
			&project.Description,
			&project.Status,
			&project.CreatedBy,
			&project.CreatedAt,
			&project.UpdatedAt,
			&project.DeletedAt,
			&project.CreatorFirstName,
			&project.CreatorLastName,
			&project.CreatorAvatarURL,
		)
		if err != nil {
			return nil, err
		}
		projects = append(projects, project)
	}
	return projects, nil
}

func (r *PostgresProjectRepository) Update(ctx context.Context, project *domain.Project, orgID uuid.UUID) error {
	query := `
		UPDATE projects
		SET name = $1, description = $2, status = $3, updated_at = NOW()
		WHERE id = $4 AND organization_id = $5 AND deleted_at IS NULL
	`
	_, err := r.db.ExecContext(ctx, query,
		project.Name,
		project.Description,
		project.Status,
		project.ID,
		orgID,
	)
	return err
}

func (r *PostgresProjectRepository) Delete(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error {
	query := `UPDATE projects SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2`
	_, err := r.db.ExecContext(ctx, query, id, orgID)
	return err
}
