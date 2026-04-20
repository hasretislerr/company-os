package domain

import (
	"context"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
)

type WebAuthnCredential struct {
	ID              uuid.UUID `json:"id"`
	UserID          uuid.UUID `json:"user_id"`
	CredentialID    []byte    `json:"credential_id"`
	PublicKey       []byte    `json:"public_key"`
	AttestationType string    `json:"attestation_type"`
	Transport       []string  `json:"transport"`
	Counter         uint32    `json:"counter"`
	BackupEligible  bool      `json:"backup_eligible"`
	BackupState     bool      `json:"backup_state"`
	CreatedAt       time.Time `json:"created_at"`
}

// Convert to webauthn.Credential
func (c *WebAuthnCredential) ToWebAuthn() webauthn.Credential {
	return webauthn.Credential{
		ID:              c.CredentialID,
		PublicKey:       c.PublicKey,
		AttestationType: c.AttestationType,
		Transport:       nil,
		Flags: webauthn.CredentialFlags{
			BackupEligible: c.BackupEligible,
			BackupState:    c.BackupState,
		},
		Authenticator: webauthn.Authenticator{
			SignCount: c.Counter,
		},
	}
}

type WebAuthnRepository interface {
	Create(ctx context.Context, cred *WebAuthnCredential) error
	GetByCredentialID(ctx context.Context, credentialID []byte) (*WebAuthnCredential, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*WebAuthnCredential, error)
	UpdateCounter(ctx context.Context, id uuid.UUID, counter uint32) error
}
