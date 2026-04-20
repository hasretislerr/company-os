package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
	"github.com/lib/pq"
)

type PostgresWebAuthnRepository struct {
	db *sql.DB
}

func NewPostgresWebAuthnRepository(db *sql.DB) *PostgresWebAuthnRepository {
	return &PostgresWebAuthnRepository{db: db}
}

func (r *PostgresWebAuthnRepository) Create(ctx context.Context, cred *domain.WebAuthnCredential) error {
	query := `
		INSERT INTO webauthn_credentials (id, user_id, credential_id, public_key, attestation_type, transport, counter, backup_eligible, backup_state, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	_, err := r.db.ExecContext(ctx, query,
		cred.ID,
		cred.UserID,
		cred.CredentialID,
		cred.PublicKey,
		cred.AttestationType,
		pq.Array(cred.Transport),
		cred.Counter,
		cred.BackupEligible,
		cred.BackupState,
		cred.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("error creating webauthn credential: %w", err)
	}
	return nil
}

func (r *PostgresWebAuthnRepository) GetByCredentialID(ctx context.Context, credentialID []byte) (*domain.WebAuthnCredential, error) {
	query := `
		SELECT id, user_id, credential_id, public_key, attestation_type, transport, counter, backup_eligible, backup_state, created_at
		FROM webauthn_credentials
		WHERE credential_id = $1`

	cred := &domain.WebAuthnCredential{}
	var transport []string
	err := r.db.QueryRowContext(ctx, query, credentialID).Scan(
		&cred.ID,
		&cred.UserID,
		&cred.CredentialID,
		&cred.PublicKey,
		&cred.AttestationType,
		pq.Array(&transport),
		&cred.Counter,
		&cred.BackupEligible,
		&cred.BackupState,
		&cred.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("error getting webauthn credential: %w", err)
	}
	cred.Transport = transport
	return cred, nil
}

func (r *PostgresWebAuthnRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]*domain.WebAuthnCredential, error) {
	query := `
		SELECT id, user_id, credential_id, public_key, attestation_type, transport, counter, backup_eligible, backup_state, created_at
		FROM webauthn_credentials
		WHERE user_id = $1`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("error listing webauthn credentials: %w", err)
	}
	defer rows.Close()

	var creds []*domain.WebAuthnCredential
	for rows.Next() {
		cred := &domain.WebAuthnCredential{}
		var transport []string
		if err := rows.Scan(
			&cred.ID,
			&cred.UserID,
			&cred.CredentialID,
			&cred.PublicKey,
			&cred.AttestationType,
			pq.Array(&transport),
			&cred.Counter,
			&cred.BackupEligible,
			&cred.BackupState,
			&cred.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("error scanning webauthn credential: %w", err)
		}
		cred.Transport = transport
		creds = append(creds, cred)
	}
	return creds, nil
}

func (r *PostgresWebAuthnRepository) UpdateCounter(ctx context.Context, id uuid.UUID, counter uint32) error {
	query := `UPDATE webauthn_credentials SET counter = $1 WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, counter, id)
	if err != nil {
		return fmt.Errorf("error updating webauthn counter: %w", err)
	}
	return nil
}
