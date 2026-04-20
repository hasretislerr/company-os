package service

import (
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/hasret/company-os/backend/internal/domain"
)

type WebAuthnUser struct {
	User        *domain.User
	Credentials []webauthn.Credential
}

func (u *WebAuthnUser) WebAuthnID() []byte {
	return u.User.ID[:]
}

func (u *WebAuthnUser) WebAuthnName() string {
	return u.User.Email
}

func (u *WebAuthnUser) WebAuthnDisplayName() string {
	return u.User.FirstName + " " + u.User.LastName
}

func (u *WebAuthnUser) WebAuthnIcon() string {
	return u.User.AvatarURL
}

func (u *WebAuthnUser) WebAuthnCredentials() []webauthn.Credential {
	return u.Credentials
}
