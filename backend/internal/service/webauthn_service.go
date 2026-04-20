package service

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/config"
	"github.com/hasret/company-os/backend/internal/domain"
	"strings"
)

type WebAuthnService struct {
	webAuthn *webauthn.WebAuthn
	userRepo domain.UserRepository
	credRepo domain.WebAuthnRepository
	sessions sync.Map // Store registration/authentication sessions
}

func NewWebAuthnService(userRepo domain.UserRepository, credRepo domain.WebAuthnRepository, cfg *config.Config) (*WebAuthnService, error) {
	origins := strings.Split(cfg.WebAuthnRPOrigins, ",")
	w, err := webauthn.New(&webauthn.Config{
		RPDisplayName: "Company OS",
		RPID:          cfg.WebAuthnRPID,
		RPOrigins:     origins,
	})
	if err != nil {
		return nil, err
	}

	return &WebAuthnService{
		webAuthn: w,
		userRepo: userRepo,
		credRepo: credRepo,
	}, nil
}

func (s *WebAuthnService) BeginRegistration(ctx context.Context, userID uuid.UUID) (*protocol.CredentialCreation, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	creds, err := s.credRepo.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	var wCreds []webauthn.Credential
	for _, c := range creds {
		wCreds = append(wCreds, c.ToWebAuthn())
	}

	wUser := &WebAuthnUser{User: user, Credentials: wCreds}

	// Require user verification (fingerprint/face/PIN) — not just device presence
	options, session, err := s.webAuthn.BeginRegistration(
		wUser,
		webauthn.WithAuthenticatorSelection(protocol.AuthenticatorSelection{
			UserVerification: protocol.VerificationRequired,
		}),
	)
	if err != nil {
		return nil, err
	}

	s.sessions.Store("reg_"+userID.String(), session)
	return options, nil
}

func (s *WebAuthnService) FinishRegistration(ctx context.Context, userID uuid.UUID, r *http.Request) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	sessionRaw, ok := s.sessions.Load("reg_" + userID.String())
	if !ok {
		return fmt.Errorf("registration session not found")
	}
	session := sessionRaw.(*webauthn.SessionData)

	wUser := &WebAuthnUser{User: user}
	credential, err := s.webAuthn.FinishRegistration(wUser, *session, r)
	if err != nil {
		return err
	}

	newCred := &domain.WebAuthnCredential{
		ID:              uuid.New(),
		UserID:          userID,
		CredentialID:    credential.ID,
		PublicKey:       credential.PublicKey,
		AttestationType: credential.AttestationType,
		Transport:       nil,
		Counter:         credential.Authenticator.SignCount,
		BackupEligible:  credential.Flags.BackupEligible,
		BackupState:     credential.Flags.BackupState,
		CreatedAt:       time.Now(),
	}

	if err := s.credRepo.Create(ctx, newCred); err != nil {
		return err
	}

	s.sessions.Delete("reg_" + userID.String())
	return nil
}

func (s *WebAuthnService) BeginLogin(ctx context.Context, userID uuid.UUID) (*protocol.CredentialAssertion, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	creds, err := s.credRepo.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	var wCreds []webauthn.Credential
	for _, c := range creds {
		wCreds = append(wCreds, c.ToWebAuthn())
	}

	wUser := &WebAuthnUser{User: user, Credentials: wCreds}

	// Require user verification — Windows Hello must verify identity, not just presence
	options, session, err := s.webAuthn.BeginLogin(
		wUser,
		webauthn.WithUserVerification(protocol.VerificationRequired),
	)
	if err != nil {
		return nil, err
	}

	s.sessions.Store("auth_"+userID.String(), session)
	return options, nil
}

func (s *WebAuthnService) FinishLogin(ctx context.Context, userID uuid.UUID, r *http.Request) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	creds, err := s.credRepo.ListByUser(ctx, userID)
	if err != nil {
		return err
	}

	var wCreds []webauthn.Credential
	for _, c := range creds {
		wCreds = append(wCreds, c.ToWebAuthn())
	}

	sessionRaw, ok := s.sessions.Load("auth_" + userID.String())
	if !ok {
		return fmt.Errorf("authentication session not found")
	}
	session := sessionRaw.(*webauthn.SessionData)

	wUser := &WebAuthnUser{User: user, Credentials: wCreds}
	credential, err := s.webAuthn.FinishLogin(wUser, *session, r)
	if err != nil {
		return err
	}

	// Update counter
	for _, c := range creds {
		if string(c.CredentialID) == string(credential.ID) {
			s.credRepo.UpdateCounter(ctx, c.ID, credential.Authenticator.SignCount)
			break
		}
	}

	s.sessions.Delete("auth_" + userID.String())
	return nil
}
