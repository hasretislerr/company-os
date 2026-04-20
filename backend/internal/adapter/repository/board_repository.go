package repository

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type PostgresBoardRepository struct {
	db *sql.DB
}

func NewPostgresBoardRepository(db *sql.DB) *PostgresBoardRepository {
	return &PostgresBoardRepository{db: db}
}

func (r *PostgresBoardRepository) Create(ctx context.Context, board *domain.Board) error {
	query := `
		INSERT INTO boards (id, organization_id, project_id, name, description, type, created_by, created_at, updated_at)
		SELECT $1, p.organization_id, $2, $3, $4, $5, $6, NOW(), NOW()
		FROM projects p
		WHERE p.id = $2
	`
	_, err := r.db.ExecContext(ctx, query,
		board.ID,
		board.ProjectID,
		board.Name,
		board.Description,
		board.Type,
		board.CreatedBy,
	)
	return err
}

func (r *PostgresBoardRepository) GetByID(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*domain.Board, error) {
	query := `
		SELECT b.id, b.organization_id, b.project_id, b.name, b.description, b.type, b.created_by, b.created_at, b.updated_at, b.deleted_at,
		       u.first_name, u.last_name, u.avatar_url
		FROM boards b
		LEFT JOIN users u ON b.created_by = u.id
		WHERE b.id = $1 AND b.organization_id = $2 AND b.deleted_at IS NULL
	`
	board := &domain.Board{}
	err := r.db.QueryRowContext(ctx, query, id, orgID).Scan(
		&board.ID,
		&board.OrganizationID,
		&board.ProjectID,
		&board.Name,
		&board.Description,
		&board.Type,
		&board.CreatedBy,
		&board.CreatedAt,
		&board.UpdatedAt,
		&board.DeletedAt,
		&board.CreatorFirstName,
		&board.CreatorLastName,
		&board.CreatorAvatarURL,
	)
	if err != nil {
		return nil, err
	}
	return board, nil
}

func (r *PostgresBoardRepository) GetByProject(ctx context.Context, projectID uuid.UUID, orgID uuid.UUID) ([]*domain.Board, error) {
	query := `
		SELECT b.id, b.organization_id, b.project_id, b.name, b.description, b.type, b.created_by, b.created_at, b.updated_at, b.deleted_at,
		       u.first_name, u.last_name, u.avatar_url
		FROM boards b
		LEFT JOIN users u ON b.created_by = u.id
		WHERE b.project_id = $1 AND b.organization_id = $2 AND b.deleted_at IS NULL
		ORDER BY b.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, projectID, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	boards := make([]*domain.Board, 0)
	for rows.Next() {
		board := &domain.Board{}
		err := rows.Scan(
			&board.ID,
			&board.OrganizationID,
			&board.ProjectID,
			&board.Name,
			&board.Description,
			&board.Type,
			&board.CreatedBy,
			&board.CreatedAt,
			&board.UpdatedAt,
			&board.DeletedAt,
			&board.CreatorFirstName,
			&board.CreatorLastName,
			&board.CreatorAvatarURL,
		)
		if err != nil {
			return nil, err
		}
		boards = append(boards, board)
	}
	return boards, nil
}

func (r *PostgresBoardRepository) Update(ctx context.Context, board *domain.Board, orgID uuid.UUID) error {
	query := `
		UPDATE boards
		SET name = $1, description = $2, type = $3, updated_at = NOW()
		WHERE id = $4 AND organization_id = $5 AND deleted_at IS NULL
	`
	_, err := r.db.ExecContext(ctx, query,
		board.Name,
		board.Description,
		board.Type,
		board.ID,
		orgID,
	)
	return err
}

func (r *PostgresBoardRepository) Delete(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error {
	query := `UPDATE boards SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2`
	_, err := r.db.ExecContext(ctx, query, id, orgID)
	return err
}

// Column operations
func (r *PostgresBoardRepository) CreateColumn(ctx context.Context, column *domain.BoardColumn) error {
	query := `
		INSERT INTO board_columns (id, organization_id, board_id, name, position, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
	`
	_, err := r.db.ExecContext(ctx, query,
		column.ID,
		column.OrganizationID,
		column.BoardID,
		column.Name,
		column.Position,
	)
	return err
}

func (r *PostgresBoardRepository) GetColumnsByBoard(ctx context.Context, boardID uuid.UUID, orgID uuid.UUID) ([]*domain.BoardColumn, error) {
	query := `
		SELECT id, organization_id, board_id, name, position, created_at, updated_at, deleted_at
		FROM board_columns
		WHERE board_id = $1 AND organization_id = $2 AND deleted_at IS NULL
		ORDER BY position ASC
	`
	rows, err := r.db.QueryContext(ctx, query, boardID, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	columns := make([]*domain.BoardColumn, 0)
	for rows.Next() {
		column := &domain.BoardColumn{}
		err := rows.Scan(
			&column.ID,
			&column.OrganizationID,
			&column.BoardID,
			&column.Name,
			&column.Position,
			&column.CreatedAt,
			&column.UpdatedAt,
			&column.DeletedAt,
		)
		if err != nil {
			return nil, err
		}
		columns = append(columns, column)
	}
	return columns, nil
}

func (r *PostgresBoardRepository) UpdateColumn(ctx context.Context, column *domain.BoardColumn, orgID uuid.UUID) error {
	query := `
		UPDATE board_columns
		SET name = $1, position = $2, updated_at = NOW()
		WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL
	`
	_, err := r.db.ExecContext(ctx, query,
		column.Name,
		column.Position,
		column.ID,
		orgID,
	)
	return err
}

func (r *PostgresBoardRepository) DeleteColumn(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error {
	query := `UPDATE board_columns SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2`
	_, err := r.db.ExecContext(ctx, query, id, orgID)
	return err
}

func (r *PostgresBoardRepository) GetColumnByID(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*domain.BoardColumn, error) {
	query := `
		SELECT id, organization_id, board_id, name, position, created_at, updated_at
		FROM board_columns
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`
	col := &domain.BoardColumn{}
	err := r.db.QueryRowContext(ctx, query, id, orgID).Scan(
		&col.ID, &col.OrganizationID, &col.BoardID, &col.Name, &col.Position, &col.CreatedAt, &col.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return col, nil
}
