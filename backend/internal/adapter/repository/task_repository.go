package repository

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type PostgresTaskRepository struct {
	db *sql.DB
}

func NewPostgresTaskRepository(db *sql.DB) *PostgresTaskRepository {
	return &PostgresTaskRepository{db: db}
}

func (r *PostgresTaskRepository) GetDB() *sql.DB {
	return r.db
}

func (r *PostgresTaskRepository) Create(ctx context.Context, task *domain.Task) error {
	query := `
		INSERT INTO tasks (id, organization_id, project_id, board_id, column_id, title, description, priority, assignee_id, due_date, position, created_by, created_at, updated_at)
		SELECT $1, b.organization_id, p.id, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
		FROM boards b
		JOIN projects p ON b.project_id = p.id
		WHERE b.id = $2
	`
	_, err := r.db.ExecContext(ctx, query,
		task.ID,
		task.BoardID,
		task.ColumnID,
		task.Title,
		task.Description,
		task.Priority,
		task.AssigneeID,
		task.DueDate,
		task.Position,
		task.CreatedBy,
	)
	return err
}

func (r *PostgresTaskRepository) GetByID(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*domain.Task, error) {
	query := `
		SELECT 
			t.id, t.organization_id, t.board_id, t.column_id, t.title, t.description, t.priority, t.assignee_id, t.due_date, t.position, t.created_by, t.created_at, t.updated_at, t.deleted_at,
			u.id, COALESCE(u.first_name, ''), COALESCE(u.last_name, ''), COALESCE(u.email, ''), COALESCE(u.avatar_url, ''),
			c.id, COALESCE(c.first_name, ''), COALESCE(c.last_name, ''), COALESCE(c.email, ''), COALESCE(c.avatar_url, '')
		FROM tasks t
		LEFT JOIN users u ON t.assignee_id = u.id
		LEFT JOIN users c ON t.created_by = c.id
		WHERE t.id = $1 AND t.organization_id = $2 AND t.deleted_at IS NULL
	`
	task := &domain.Task{}
	var uID, cID uuid.NullUUID
	var uFirstName, uLastName, uEmail, uAvatar, cFirstName, cLastName, cEmail, cAvatar sql.NullString

	err := r.db.QueryRowContext(ctx, query, id, orgID).Scan(
		&task.ID,
		&task.OrganizationID,
		&task.BoardID,
		&task.ColumnID,
		&task.Title,
		&task.Description,
		&task.Priority,
		&task.AssigneeID,
		&task.DueDate,
		&task.Position,
		&task.CreatedBy,
		&task.CreatedAt,
		&task.UpdatedAt,
		&task.DeletedAt,
		&uID,
		&uFirstName,
		&uLastName,
		&uEmail,
		&uAvatar,
		&cID,
		&cFirstName,
		&cLastName,
		&cEmail,
		&cAvatar,
	)
	if err != nil {
		return nil, err
	}

	if uID.Valid {
		task.Assignee = &domain.User{
			ID:        uID.UUID,
			FirstName: uFirstName.String,
			LastName:  uLastName.String,
			Email:     uEmail.String,
			AvatarURL: uAvatar.String,
		}
	}

	if cID.Valid {
		task.Creator = &domain.User{
			ID:        cID.UUID,
			FirstName: cFirstName.String,
			LastName:  cLastName.String,
			Email:     cEmail.String,
			AvatarURL: cAvatar.String,
		}
	}

	return task, nil
}

func (r *PostgresTaskRepository) GetByBoard(ctx context.Context, boardID uuid.UUID, orgID uuid.UUID) ([]*domain.Task, error) {
	query := `
		SELECT 
			t.id, t.organization_id, t.board_id, t.column_id, t.title, t.description, t.priority, t.assignee_id, t.due_date, t.position, t.created_by, t.created_at, t.updated_at, t.deleted_at,
			u.id, COALESCE(u.first_name, ''), COALESCE(u.last_name, ''), COALESCE(u.email, ''), COALESCE(u.avatar_url, ''),
			c.id, COALESCE(c.first_name, ''), COALESCE(c.last_name, ''), COALESCE(c.email, ''), COALESCE(c.avatar_url, '')
		FROM tasks t
		LEFT JOIN users u ON t.assignee_id = u.id
		LEFT JOIN users c ON t.created_by = c.id
		WHERE t.board_id = $1 AND t.organization_id = $2 AND t.deleted_at IS NULL
		ORDER BY t.position ASC, t.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, boardID, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tasks := make([]*domain.Task, 0)
	for rows.Next() {
		task := &domain.Task{}
		var uID, cID uuid.NullUUID
		var uFirstName, uLastName, uEmail, uAvatar, cFirstName, cLastName, cEmail, cAvatar sql.NullString

		err := rows.Scan(
			&task.ID,
			&task.OrganizationID,
			&task.BoardID,
			&task.ColumnID,
			&task.Title,
			&task.Description,
			&task.Priority,
			&task.AssigneeID,
			&task.DueDate,
			&task.Position,
			&task.CreatedBy,
			&task.CreatedAt,
			&task.UpdatedAt,
			&task.DeletedAt,
			&uID,
			&uFirstName,
			&uLastName,
			&uEmail,
			&uAvatar,
			&cID,
			&cFirstName,
			&cLastName,
			&cEmail,
			&cAvatar,
		)
		if err != nil {
			return nil, err
		}

		if uID.Valid {
			task.Assignee = &domain.User{
				ID:        uID.UUID,
				FirstName: uFirstName.String,
				LastName:  uLastName.String,
				Email:     uEmail.String,
				AvatarURL: uAvatar.String,
			}
		}

		if cID.Valid {
			task.Creator = &domain.User{
				ID:        cID.UUID,
				FirstName: cFirstName.String,
				LastName:  cLastName.String,
				Email:     cEmail.String,
				AvatarURL: cAvatar.String,
			}
		}

		tasks = append(tasks, task)
	}
	return tasks, nil
}

func (r *PostgresTaskRepository) GetByColumn(ctx context.Context, columnID uuid.UUID, orgID uuid.UUID) ([]*domain.Task, error) {
	query := `
		SELECT 
			t.id, t.organization_id, t.board_id, t.column_id, t.title, t.description, t.priority, t.assignee_id, t.due_date, t.position, t.created_by, t.created_at, t.updated_at, t.deleted_at,
			u.id, COALESCE(u.first_name, ''), COALESCE(u.last_name, ''), COALESCE(u.email, ''), COALESCE(u.avatar_url, ''),
			c.id, COALESCE(c.first_name, ''), COALESCE(c.last_name, ''), COALESCE(c.email, ''), COALESCE(c.avatar_url, '')
		FROM tasks t
		LEFT JOIN users u ON t.assignee_id = u.id
		LEFT JOIN users c ON t.created_by = c.id
		WHERE t.column_id = $1 AND t.organization_id = $2 AND t.deleted_at IS NULL
		ORDER BY t.position ASC, t.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, columnID, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tasks := make([]*domain.Task, 0)
	for rows.Next() {
		task := &domain.Task{}
		var uID, cID uuid.NullUUID
		var uFirstName, uLastName, uEmail, uAvatar, cFirstName, cLastName, cEmail, cAvatar sql.NullString

		err := rows.Scan(
			&task.ID,
			&task.OrganizationID,
			&task.BoardID,
			&task.ColumnID,
			&task.Title,
			&task.Description,
			&task.Priority,
			&task.AssigneeID,
			&task.DueDate,
			&task.Position,
			&task.CreatedBy,
			&task.CreatedAt,
			&task.UpdatedAt,
			&task.DeletedAt,
			&uID,
			&uFirstName,
			&uLastName,
			&uEmail,
			&uAvatar,
			&cID,
			&cFirstName,
			&cLastName,
			&cEmail,
			&cAvatar,
		)
		if err != nil {
			return nil, err
		}

		if uID.Valid {
			task.Assignee = &domain.User{
				ID:        uID.UUID,
				FirstName: uFirstName.String,
				LastName:  uLastName.String,
				Email:     uEmail.String,
				AvatarURL: uAvatar.String,
			}
		}

		if cID.Valid {
			task.Creator = &domain.User{
				ID:        cID.UUID,
				FirstName: cFirstName.String,
				LastName:  cLastName.String,
				Email:     cEmail.String,
				AvatarURL: cAvatar.String,
			}
		}

		tasks = append(tasks, task)
	}
	return tasks, nil
}

func (r *PostgresTaskRepository) ListByUser(ctx context.Context, userID uuid.UUID, orgID uuid.UUID) ([]*domain.Task, error) {
	query := `
		SELECT 
			t.id, t.organization_id, t.board_id, t.column_id, t.title, t.description, t.priority, t.assignee_id, t.due_date, t.position, t.created_by, t.created_at, t.updated_at, t.deleted_at,
			u.id, COALESCE(u.first_name, ''), COALESCE(u.last_name, ''), COALESCE(u.email, ''), COALESCE(u.avatar_url, ''),
			c.id, COALESCE(c.first_name, ''), COALESCE(c.last_name, ''), COALESCE(c.email, ''), COALESCE(c.avatar_url, '')
		FROM tasks t
		LEFT JOIN users u ON t.assignee_id = u.id
		LEFT JOIN users c ON t.created_by = c.id
		WHERE (t.assignee_id = $1 OR t.created_by = $1) AND t.organization_id = $2 AND t.deleted_at IS NULL
		ORDER BY t.due_date ASC, t.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, userID, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tasks := make([]*domain.Task, 0)
	for rows.Next() {
		task := &domain.Task{}
		var uID, cID uuid.NullUUID
		var uFirstName, uLastName, uEmail, uAvatar, cFirstName, cLastName, cEmail, cAvatar sql.NullString

		err := rows.Scan(
			&task.ID,
			&task.OrganizationID,
			&task.BoardID,
			&task.ColumnID,
			&task.Title,
			&task.Description,
			&task.Priority,
			&task.AssigneeID,
			&task.DueDate,
			&task.Position,
			&task.CreatedBy,
			&task.CreatedAt,
			&task.UpdatedAt,
			&task.DeletedAt,
			&uID,
			&uFirstName,
			&uLastName,
			&uEmail,
			&uAvatar,
			&cID,
			&cFirstName,
			&cLastName,
			&cEmail,
			&cAvatar,
		)
		if err != nil {
			return nil, err
		}

		if uID.Valid {
			task.Assignee = &domain.User{
				ID:        uID.UUID,
				FirstName: uFirstName.String,
				LastName:  uLastName.String,
				Email:     uEmail.String,
				AvatarURL: uAvatar.String,
			}
		}

		if cID.Valid {
			task.Creator = &domain.User{
				ID:        cID.UUID,
				FirstName: cFirstName.String,
				LastName:  cLastName.String,
				Email:     cEmail.String,
				AvatarURL: cAvatar.String,
			}
		}

		tasks = append(tasks, task)
	}
	return tasks, nil
}

func (r *PostgresTaskRepository) Update(ctx context.Context, task *domain.Task, orgID uuid.UUID) error {
	query := `
		UPDATE tasks
		SET column_id = $1, title = $2, description = $3, priority = $4, assignee_id = $5, due_date = $6, position = $7, updated_at = NOW()
		WHERE id = $8 AND organization_id = $9 AND deleted_at IS NULL
	`
	_, err := r.db.ExecContext(ctx, query,
		task.ColumnID,
		task.Title,
		task.Description,
		task.Priority,
		task.AssigneeID,
		task.DueDate,
		task.Position,
		task.ID,
		orgID,
	)
	return err
}

func (r *PostgresTaskRepository) Delete(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error {
	query := `UPDATE tasks SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2`
	_, err := r.db.ExecContext(ctx, query, id, orgID)
	return err
}
