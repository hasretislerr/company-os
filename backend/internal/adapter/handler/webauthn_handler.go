package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/service"
)

type WebAuthnHandler struct {
	svc *service.WebAuthnService
}

func NewWebAuthnHandler(svc *service.WebAuthnService) *WebAuthnHandler {
	return &WebAuthnHandler{svc: svc}
}

func (h *WebAuthnHandler) BeginRegistration(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(UserIDKey).(uuid.UUID)
	options, err := h.svc.BeginRegistration(r.Context(), userID)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	json.NewEncoder(w).Encode(options)
}

func (h *WebAuthnHandler) FinishRegistration(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(UserIDKey).(uuid.UUID)

	if err := h.svc.FinishRegistration(r.Context(), userID, r); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *WebAuthnHandler) BeginLogin(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(UserIDKey).(uuid.UUID)
	options, err := h.svc.BeginLogin(r.Context(), userID)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	json.NewEncoder(w).Encode(options)
}

func (h *WebAuthnHandler) FinishLogin(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(UserIDKey).(uuid.UUID)

	if err := h.svc.FinishLogin(r.Context(), userID, r); err != nil {
		log.Printf("[WebAuthn] FinishLogin FAILED for user %s: %v", userID, err)
		RespondWithError(w, http.StatusBadRequest, err.Error()) // 400 not 401 to avoid logout
		return
	}

	log.Printf("[WebAuthn] FinishLogin SUCCESS for user %s", userID)
	w.WriteHeader(http.StatusOK)
}
