package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type PostgresOrganizationRepository struct {
	db *sql.DB
}

func NewPostgresOrganizationRepository(db *sql.DB) *PostgresOrganizationRepository {
	return &PostgresOrganizationRepository{db: db}
}

func (r *PostgresOrganizationRepository) GetDB() *sql.DB {
	return r.db
}

func (r *PostgresOrganizationRepository) ListAll(ctx context.Context) ([]*domain.Organization, error) {
	query := `
		SELECT o.id, o.name, o.slug, o.plan_type, o.created_by, o.created_at, o.updated_at, o.deleted_at,
		       COALESCE(u.first_name, ''), COALESCE(u.last_name, '')
		FROM organizations o
		LEFT JOIN users u ON o.created_by = u.id
		WHERE o.deleted_at IS NULL
		ORDER BY o.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orgs []*domain.Organization
	for rows.Next() {
		org := &domain.Organization{}
		err := rows.Scan(
			&org.ID, &org.Name, &org.Slug, &org.PlanType, &org.CreatedBy,
			&org.CreatedAt, &org.UpdatedAt, &org.DeletedAt,
			&org.CreatorFirstName, &org.CreatorLastName,
		)
		if err != nil {
			return nil, err
		}
		orgs = append(orgs, org)
	}
	return orgs, nil
}

func (r *PostgresOrganizationRepository) Create(ctx context.Context, org *domain.Organization) error {
	query := `
		INSERT INTO organizations (id, name, slug, plan_type, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
	`
	_, err := r.db.ExecContext(ctx, query, org.ID, org.Name, org.Slug, org.PlanType, org.CreatedBy)
	return err
}

func (r *PostgresOrganizationRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Organization, error) {
	query := `
		SELECT o.id, o.name, o.slug, o.plan_type, o.created_by, o.created_at, o.updated_at, o.deleted_at,
		       COALESCE(u.first_name, ''), COALESCE(u.last_name, '')
		FROM organizations o
		LEFT JOIN users u ON o.created_by = u.id
		WHERE o.id = $1 AND o.deleted_at IS NULL
	`
	org := &domain.Organization{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&org.ID, &org.Name, &org.Slug, &org.PlanType, &org.CreatedBy,
		&org.CreatedAt, &org.UpdatedAt, &org.DeletedAt,
		&org.CreatorFirstName, &org.CreatorLastName,
	)
	if err != nil {
		return nil, err
	}
	return org, nil
}

func (r *PostgresOrganizationRepository) GetUserOrganizations(ctx context.Context, userID uuid.UUID) ([]*domain.Organization, error) {
	query := `
		SELECT o.id, o.name, o.slug, o.plan_type, o.created_by, o.created_at, o.updated_at, o.deleted_at,
		       COALESCE(u.first_name, ''), COALESCE(u.last_name, '')
		FROM organizations o
		INNER JOIN organization_members om ON o.id = om.organization_id
		LEFT JOIN users u ON o.created_by = u.id
		WHERE om.user_id = $1 AND o.deleted_at IS NULL
		ORDER BY o.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orgs []*domain.Organization
	for rows.Next() {
		org := &domain.Organization{}
		err := rows.Scan(
			&org.ID, &org.Name, &org.Slug, &org.PlanType, &org.CreatedBy,
			&org.CreatedAt, &org.UpdatedAt, &org.DeletedAt,
			&org.CreatorFirstName, &org.CreatorLastName,
		)
		if err != nil {
			return nil, err
		}
		orgs = append(orgs, org)
	}
	return orgs, nil
}

func (r *PostgresOrganizationRepository) Update(ctx context.Context, org *domain.Organization) error {
	query := `
		UPDATE organizations SET name = $1, slug = $2, plan_type = $3, updated_at = NOW()
		WHERE id = $4 AND deleted_at IS NULL
	`
	_, err := r.db.ExecContext(ctx, query, org.Name, org.Slug, org.PlanType, org.ID)
	return err
}

func (r *PostgresOrganizationRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE organizations SET deleted_at = NOW() WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *PostgresOrganizationRepository) GetUserRole(ctx context.Context, userID uuid.UUID, orgID uuid.UUID) (string, error) {
	query := `
		SELECT role FROM organization_members
		WHERE user_id = $1 AND organization_id = $2
	`
	var role string
	err := r.db.QueryRowContext(ctx, query, userID, orgID).Scan(&role)
	if err != nil {
		return "", err
	}
	return role, nil
}

func (r *PostgresOrganizationRepository) AddMember(ctx context.Context, member *domain.OrganizationMember) error {
	query := `
		INSERT INTO organization_members (id, organization_id, user_id, role_id, role, department, joined_at, deleted_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NULL)
		ON CONFLICT (organization_id, user_id) DO UPDATE SET
			role = EXCLUDED.role,
			department = EXCLUDED.department,
			joined_at = NOW(),
			deleted_at = NULL
	`
	_, err := r.db.ExecContext(ctx, query, member.ID, member.OrganizationID, member.UserID, member.RoleID, member.Role, member.Department)
	return err
}

func (r *PostgresOrganizationRepository) UpdateMemberRoleAndDepartment(ctx context.Context, orgID uuid.UUID, userID uuid.UUID, role, department string) error {
	query := `
		UPDATE organization_members
		SET role = $1, department = $2
		WHERE organization_id = $3 AND user_id = $4
	`
	_, err := r.db.ExecContext(ctx, query, role, department, orgID, userID)
	return err
}

func (r *PostgresOrganizationRepository) IsMember(ctx context.Context, userID, orgID uuid.UUID) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM organization_members 
			WHERE user_id = $1 AND organization_id = $2 AND deleted_at IS NULL
		)
	`
	var exists bool
	err := r.db.QueryRowContext(ctx, query, userID, orgID).Scan(&exists)
	return exists, err
}

func (r *PostgresOrganizationRepository) GetMembersByTarget(ctx context.Context, orgID uuid.UUID, departments []string, roles []string) ([]uuid.UUID, error) {
	query := `
		SELECT user_id FROM organization_members
		WHERE organization_id = $1
	`
	args := []interface{}{orgID}

	if len(departments) > 0 {
		query += " AND department = ANY($2)"
		args = append(args, departments)
	}

	if len(roles) > 0 {
		argNum := len(args) + 1
		query += fmt.Sprintf(" AND role = ANY($%d)", argNum)
		args = append(args, roles)
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var userIDs []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		userIDs = append(userIDs, id)
	}
	return userIDs, nil
}
