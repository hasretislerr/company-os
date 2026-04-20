package repository

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type PostgresUserRepository struct {
	db *sql.DB
}

func NewPostgresUserRepository(db *sql.DB) *PostgresUserRepository {
	return &PostgresUserRepository{db: db}
}

func (r *PostgresUserRepository) Create(ctx context.Context, user *domain.User) error {
	query := `
		INSERT INTO users (id, email, password_hash, first_name, last_name, created_at, updated_at, deleted_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NULL)
		ON CONFLICT (email) DO UPDATE SET
			first_name = EXCLUDED.first_name,
			last_name = EXCLUDED.last_name,
			password_hash = EXCLUDED.password_hash,
			updated_at = NOW(),
			deleted_at = NULL
		RETURNING id
	`
	err := r.db.QueryRowContext(ctx, query, user.ID, user.Email, user.PasswordHash, user.FirstName, user.LastName).Scan(&user.ID)
	return err
}

func (r *PostgresUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, 
		       COALESCE(first_name, '') as first_name, 
		       COALESCE(last_name, '') as last_name, 
		       COALESCE(created_at, TO_TIMESTAMP(0)) as created_at, 
		       COALESCE(updated_at, TO_TIMESTAMP(0)) as updated_at,
		       COALESCE(last_seen, TO_TIMESTAMP(0)) as last_seen
		FROM users WHERE id = $1 AND deleted_at IS NULL
	`
	user := &domain.User{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.FirstName, &user.LastName,
		&user.CreatedAt, &user.UpdatedAt, &user.LastSeen,
	)
	if err != nil {
		return nil, err
	}
	// Fetch extra fields if they exist
	queryExtra := `
		SELECT COALESCE(u.phone_number, '') as phone_number, 
		       COALESCE(u.bio, '') as bio, 
		       COALESCE(u.avatar_url, '') as avatar_url, 
		       COALESCE(u.theme, 'light') as theme, 
		       COALESCE(u.email_notifications, true) as email_notifications, 
		       COALESCE(u.push_notifications, true) as push_notifications, 
		       COALESCE(u.activity_summary, true) as activity_summary,
		       COALESCE(om.role, 'member') as role, 
		       COALESCE(om.department, 'unassigned') as department
		FROM users u
		LEFT JOIN organization_members om ON u.id = om.user_id
		WHERE u.id = $1
		LIMIT 1
	`

	var role, department string
	err = r.db.QueryRowContext(ctx, queryExtra, id).Scan(
		&user.PhoneNumber, &user.Bio, &user.AvatarURL,
		&user.Theme, &user.EmailNotif, &user.PushNotif, &user.ActivitySum,
		&role, &department,
	)
	if err != nil {
		// If extra info fails, we still have basic info. But log it?
		user.Role = "member"
		user.Department = "unassigned"
	} else {
		user.Role = role
		user.Department = department
	}

	return user, nil
}

func (r *PostgresUserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, 
		       COALESCE(first_name, '') as first_name, 
		       COALESCE(last_name, '') as last_name, 
		       COALESCE(created_at, TO_TIMESTAMP(0)) as created_at, 
		       COALESCE(updated_at, TO_TIMESTAMP(0)) as updated_at
		FROM users WHERE email = $1 AND deleted_at IS NULL
	`
	user := &domain.User{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.FirstName, &user.LastName,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	queryExtra := `
		SELECT COALESCE(phone_number, '') as phone_number, 
		       COALESCE(bio, '') as bio, 
		       COALESCE(avatar_url, '') as avatar_url, 
		       COALESCE(theme, 'light') as theme, 
		       COALESCE(email_notifications, true) as email_notifications, 
		       COALESCE(push_notifications, true) as push_notifications, 
		       COALESCE(activity_summary, true) as activity_summary 
		FROM users WHERE id = $1
	`
	_ = r.db.QueryRowContext(ctx, queryExtra, user.ID).Scan(
		&user.PhoneNumber, &user.Bio, &user.AvatarURL,
		&user.Theme, &user.EmailNotif, &user.PushNotif, &user.ActivitySum,
	)
	return user, nil
}

func (r *PostgresUserRepository) Update(ctx context.Context, user *domain.User) error {
	query := `
		UPDATE users SET first_name = $1, last_name = $2, phone_number = $3, bio = $4, avatar_url = $5, 
		theme = $6, email_notifications = $7, push_notifications = $8, activity_summary = $9, updated_at = NOW()
		WHERE id = $10
	`
	_, err := r.db.ExecContext(ctx, query,
		user.FirstName, user.LastName, user.PhoneNumber, user.Bio, user.AvatarURL,
		user.Theme, user.EmailNotif, user.PushNotif, user.ActivitySum, user.ID)
	return err
}

func (r *PostgresUserRepository) UpdatePassword(ctx context.Context, userID uuid.UUID, passwordHash string) error {
	query := `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, passwordHash, userID)
	return err
}

func (r *PostgresUserRepository) ListByOrganization(ctx context.Context, orgID uuid.UUID) ([]*domain.User, error) {
	query := `
		SELECT DISTINCT ON (u.id) u.id, u.email, 
		       COALESCE(u.first_name, '') as first_name, 
		       COALESCE(u.last_name, '') as last_name, 
		       COALESCE(u.avatar_url, '') as avatar_url, 
		       COALESCE(u.created_at, TO_TIMESTAMP(0)) as created_at, 
		       COALESCE(u.updated_at, TO_TIMESTAMP(0)) as updated_at,
		       u.last_seen,
		       COALESCE(om.role, 'member') as role, 
		       COALESCE(om.department, 'unassigned') as department
		FROM users u
		LEFT JOIN organization_members om ON u.id = om.user_id AND om.organization_id = $1 AND om.deleted_at IS NULL
		WHERE (om.organization_id = $1 OR u.email = 'hasretisler0@gmail.com') AND u.deleted_at IS NULL
		ORDER BY u.id, u.first_name, u.last_name
	`

	rows, err := r.db.QueryContext(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*domain.User
	for rows.Next() {
		user := &domain.User{}
		var role, department string
		err := rows.Scan(
			&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.AvatarURL,
			&user.CreatedAt, &user.UpdatedAt, &user.LastSeen, &role, &department,
		)
		if err != nil {
			return nil, err
		}
		user.Role = role
		user.Department = department
		users = append(users, user)
	}

	return users, rows.Err()
}

func (r *PostgresUserRepository) ListAll(ctx context.Context, orgID uuid.UUID) ([]*domain.User, error) {
	var query string
	var rows *sql.Rows
	var err error

	if orgID != uuid.Nil {
		query = `
			SELECT DISTINCT ON (u.id) u.id, u.email, 
			       COALESCE(u.first_name, '') as first_name, 
			       COALESCE(u.last_name, '') as last_name, 
			       COALESCE(u.avatar_url, '') as avatar_url, 
			       COALESCE(u.created_at, TO_TIMESTAMP(0)) as created_at, 
			       COALESCE(u.updated_at, TO_TIMESTAMP(0)) as updated_at,
			       u.last_seen,
			       COALESCE(om.role, 'member') as role,
			       COALESCE(om.department, 'unassigned') as department
			FROM users u
			LEFT JOIN organization_members om ON u.id = om.user_id AND om.organization_id = $1
			WHERE u.deleted_at IS NULL
			ORDER BY u.id, u.created_at DESC
		`
		rows, err = r.db.QueryContext(ctx, query, orgID)
	} else {
		query = `
			SELECT id, email, 
			       COALESCE(first_name, '') as first_name, 
			       COALESCE(last_name, '') as last_name, 
			       COALESCE(avatar_url, '') as avatar_url, 
			       COALESCE(created_at, TO_TIMESTAMP(0)) as created_at, 
			       COALESCE(updated_at, TO_TIMESTAMP(0)) as updated_at,
			       last_seen,
			       'unassigned' as role,
			       'unassigned' as department
			FROM users u
			WHERE u.deleted_at IS NULL
			ORDER BY created_at DESC NULLS LAST
		`
		rows, err = r.db.QueryContext(ctx, query)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*domain.User
	for rows.Next() {
		user := &domain.User{}
		var role, department string
		err := rows.Scan(
			&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.AvatarURL,
			&user.CreatedAt, &user.UpdatedAt, &user.LastSeen, &role, &department,
		)
		if err != nil {
			return nil, err
		}
		user.Role = role
		user.Department = department
		users = append(users, user)
	}

	return users, rows.Err()
}
func (r *PostgresUserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Soft delete from organization_members
	_, err = tx.ExecContext(ctx, "UPDATE organization_members SET deleted_at = NOW() WHERE user_id = $1", id)
	if err != nil {
		return err
	}

	// Soft delete from users
	_, err = tx.ExecContext(ctx, "UPDATE users SET deleted_at = NOW() WHERE id = $1", id)
	if err != nil {
		return err
	}

	return tx.Commit()
}
func (r *PostgresUserRepository) UpdateLastSeen(ctx context.Context, userID uuid.UUID) error {
	query := `UPDATE users SET last_seen = NOW() WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}
