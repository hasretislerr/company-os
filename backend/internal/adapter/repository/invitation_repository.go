package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type PostgresInvitationRepository struct {
	db *sql.DB
}

func NewPostgresInvitationRepository(db *sql.DB) *PostgresInvitationRepository {
	return &PostgresInvitationRepository{db: db}
}

func (r *PostgresInvitationRepository) Create(ctx context.Context, inv *domain.Invitation) error {
	query := `
		INSERT INTO invitations (id, organization_id, email, first_name, last_name, role, department, verification_code, invited_by, created_at, expires_at, is_verified)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		ON CONFLICT (organization_id, email) 
		DO UPDATE SET 
			first_name = EXCLUDED.first_name,
			last_name = EXCLUDED.last_name,
			role = EXCLUDED.role,
			department = EXCLUDED.department,
			verification_code = EXCLUDED.verification_code,
			invited_by = EXCLUDED.invited_by,
			created_at = EXCLUDED.created_at,
			expires_at = EXCLUDED.expires_at,
			is_verified = FALSE
	`
	_, err := r.db.ExecContext(ctx, query,
		inv.ID, inv.OrganizationID, inv.Email, inv.FirstName, inv.LastName,
		inv.Role, inv.Department, inv.VerificationCode, inv.InvitedBy,
		inv.CreatedAt, inv.ExpiresAt, inv.IsVerified,
	)
	return err
}

func (r *PostgresInvitationRepository) GetByEmailAndCode(ctx context.Context, email, code string) (*domain.Invitation, error) {
	query := `
		SELECT id, organization_id, email, first_name, last_name, role, department, verification_code, invited_by, created_at, expires_at, is_verified
		FROM invitations
		WHERE email = $1 AND verification_code = $2 AND is_verified = FALSE
	`
	inv := &domain.Invitation{}
	err := r.db.QueryRowContext(ctx, query, email, code).Scan(
		&inv.ID, &inv.OrganizationID, &inv.Email, &inv.FirstName, &inv.LastName,
		&inv.Role, &inv.Department, &inv.VerificationCode, &inv.InvitedBy,
		&inv.CreatedAt, &inv.ExpiresAt, &inv.IsVerified,
	)
	if err == sql.ErrNoRows {
		return nil, errors.New("invitation not found or invalid code")
	}
	if err != nil {
		return nil, err
	}
	return inv, nil
}

func (r *PostgresInvitationRepository) GetByEmail(ctx context.Context, email string) (*domain.Invitation, error) {
	query := `
		SELECT id, organization_id, email, first_name, last_name, role, department, verification_code, invited_by, created_at, expires_at, is_verified
		FROM invitations
		WHERE email = $1
	`
	inv := &domain.Invitation{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&inv.ID, &inv.OrganizationID, &inv.Email, &inv.FirstName, &inv.LastName,
		&inv.Role, &inv.Department, &inv.VerificationCode, &inv.InvitedBy,
		&inv.CreatedAt, &inv.ExpiresAt, &inv.IsVerified,
	)
	if err == sql.ErrNoRows {
		return nil, nil // not found, but avoiding error for existence checks
	}
	if err != nil {
		return nil, err
	}
	return inv, nil
}

func (r *PostgresInvitationRepository) MarkAsVerified(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE invitations SET is_verified = TRUE WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *PostgresInvitationRepository) ListByOrganization(ctx context.Context, orgID uuid.UUID) ([]*domain.Invitation, error) {
	query := `
		SELECT id, organization_id, email, first_name, last_name, role, department, verification_code, invited_by, created_at, expires_at, is_verified
		FROM invitations
		WHERE organization_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invs []*domain.Invitation
	for rows.Next() {
		inv := &domain.Invitation{}
		err := rows.Scan(
			&inv.ID, &inv.OrganizationID, &inv.Email, &inv.FirstName, &inv.LastName,
			&inv.Role, &inv.Department, &inv.VerificationCode, &inv.InvitedBy,
			&inv.CreatedAt, &inv.ExpiresAt, &inv.IsVerified,
		)
		if err != nil {
			return nil, err
		}
		invs = append(invs, inv)
	}
	return invs, nil
}

func (r *PostgresInvitationRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM invitations WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}
