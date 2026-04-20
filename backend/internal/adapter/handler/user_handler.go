package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/adapter/repository"
	"github.com/hasret/company-os/backend/internal/adapter/search"
)

type UserHandler struct {
	userRepo *repository.PostgresUserRepository
	indexer  *search.Indexer
}

func NewUserHandler(userRepo *repository.PostgresUserRepository, indexer *search.Indexer) *UserHandler {
	return &UserHandler{
		userRepo: userRepo,
		indexer:  indexer,
	}
}

type UserResponse struct {
	ID         string `json:"id"`
	Email      string `json:"email"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	AvatarURL  string `json:"avatar_url"`
	Role       string `json:"role"`
	Department string `json:"department"`
}

// ListOrganizationUsers returns all users in the organization
func (h *UserHandler) ListOrganizationUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get organization ID from context (set by OrgMiddleware)
	orgID, ok := GetOrgID(ctx)
	if !ok {
		RespondWithError(w, http.StatusBadRequest, "Organization context required")
		return
	}

	users, err := h.userRepo.ListByOrganization(ctx, orgID)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch users")
		return
	}

	// Convert to response format
	response := make([]UserResponse, len(users))
	for i, user := range users {
		response[i] = UserResponse{
			ID:         user.ID.String(),
			Email:      user.Email,
			FirstName:  user.FirstName,
			LastName:   user.LastName,
			AvatarURL:  user.AvatarURL,
			Role:       user.Role,
			Department: user.Department,
		}

	}

	RespondWithJSON(w, http.StatusOK, response)
}

// ListAllUsers returns all users in the system (Admin only)
func (h *UserHandler) ListAllUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	role, _ := GetUserRole(ctx)
	fmt.Printf("ListAllUsers called by role: %s\n", role)

	if role != "admin" {
		RespondWithError(w, http.StatusForbidden, "Only admins can view all users")
		return
	}

	// Try to get orgID from query parameters
	orgIDStr := r.URL.Query().Get("orgId")
	var orgID uuid.UUID
	if orgIDStr != "" {
		orgID, _ = uuid.Parse(orgIDStr)
	}

	if orgID == uuid.Nil {
		// Fallback to context if not in query
		if id, ok := GetOrgID(ctx); ok {
			orgID = id
		}
	}

	users, err := h.userRepo.ListAll(ctx, orgID)
	if err != nil {
		fmt.Printf("Error fetching all users: %v\n", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch all users")
		return
	}

	// Convert to response format
	response := make([]UserResponse, len(users))
	for i, user := range users {
		response[i] = UserResponse{
			ID:         user.ID.String(),
			Email:      user.Email,
			FirstName:  user.FirstName,
			LastName:   user.LastName,
			AvatarURL:  user.AvatarURL,
			Role:       user.Role,
			Department: user.Department,
		}

	}

	RespondWithJSON(w, http.StatusOK, response)
}

// GetProfile returns the current user's profile
func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID, ok := GetUserID(ctx)
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	user, err := h.userRepo.GetByID(ctx, userID)
	if err != nil {
		fmt.Printf("[API] GetProfile error for userID %s: %v\n", userID, err)
		RespondWithError(w, http.StatusNotFound, "User not found")
		return
	}

	user.PasswordHash = "" // Safety first
	RespondWithJSON(w, http.StatusOK, user)
}

// UpdateProfile updates the current user's profile
func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID, ok := GetUserID(ctx)
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		FirstName   string `json:"first_name"`
		LastName    string `json:"last_name"`
		PhoneNumber string `json:"phone_number"`
		Bio         string `json:"bio"`
		AvatarURL   string `json:"avatar_url"`
		Theme       string `json:"theme"`
		EmailNotif  *bool  `json:"email_notifications"`
		PushNotif   *bool  `json:"push_notifications"`
		ActivitySum *bool  `json:"activity_summary"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := h.userRepo.GetByID(ctx, userID)
	if err != nil {
		fmt.Printf("[API] UpdateProfile error for userID %s: %v\n", userID, err)
		RespondWithError(w, http.StatusNotFound, "User not found")
		return
	}

	if req.FirstName != "" {
		user.FirstName = req.FirstName
	}
	if req.LastName != "" {
		user.LastName = req.LastName
	}
	if req.PhoneNumber != "" {
		user.PhoneNumber = req.PhoneNumber
	}
	if req.Bio != "" {
		user.Bio = req.Bio
	}
	if req.AvatarURL != "" {
		user.AvatarURL = req.AvatarURL
	}
	if req.Theme != "" {
		user.Theme = req.Theme
	}
	if req.EmailNotif != nil {
		user.EmailNotif = *req.EmailNotif
	}
	if req.PushNotif != nil {
		user.PushNotif = *req.PushNotif
	}
	if req.ActivitySum != nil {
		user.ActivitySum = *req.ActivitySum
	}

	if err := h.userRepo.Update(ctx, user); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to update profile")
		return
	}

	if h.indexer != nil {
		orgID, _ := GetOrgID(ctx)
		go h.indexer.IndexUser(context.Background(), user, &orgID)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}
func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	
	// Sadece admin silebilir
	role, _ := GetUserRole(ctx)
	if role != "admin" {
		RespondWithError(w, http.StatusForbidden, "Sadece yöneticiler kullanıcı silebilir")
		return
	}

	idStr := chi.URLParam(r, "id")
	userID, err := uuid.Parse(idStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Geçersiz kullanıcı ID")
		return
	}

	if err := h.userRepo.Delete(ctx, userID); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Kullanıcı silinemedi")
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Kullanıcı başarıyla silindi"})
}
