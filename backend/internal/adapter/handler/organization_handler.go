package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/adapter/repository"
	"github.com/hasret/company-os/backend/internal/adapter/search"
	"github.com/hasret/company-os/backend/internal/domain"
	"github.com/hasret/company-os/backend/internal/service"
)

type OrganizationHandler struct {
	orgRepo       *repository.PostgresOrganizationRepository
	orgService    *service.OrganizationService
	notifyService *service.NotificationService
	indexer       *search.Indexer
}

func NewOrganizationHandler(db *sql.DB, notifyService *service.NotificationService, indexer *search.Indexer) *OrganizationHandler {
	orgRepo := repository.NewPostgresOrganizationRepository(db)
	return &OrganizationHandler{
		orgRepo:       orgRepo,
		orgService:    service.NewOrganizationService(orgRepo),
		notifyService: notifyService,
		indexer:       indexer,
	}
}

type CreateOrganizationRequest struct {
	Name string `json:"name"`
}

type OrganizationResponse struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Slug             string `json:"slug"`
	PlanType         string `json:"plan_type"`
	CreatedBy        string `json:"created_by"`
	CreatorFirstName string `json:"creator_first_name,omitempty"`
	CreatorLastName  string `json:"creator_last_name,omitempty"`
}

type SelectOrganizationResponse struct {
	Token        string               `json:"token"`
	Organization OrganizationResponse `json:"organization"`
}

func (h *OrganizationHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "User not found in context")
		return
	}

	var req CreateOrganizationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	if req.Name == "" {
		RespondWithError(w, http.StatusBadRequest, "Organization name is required")
		return
	}

	org, err := h.orgService.CreateOrganization(r.Context(), req.Name, userID)
	if err != nil {
		log.Printf("Error creating organization: %v", err)
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	RespondWithJSON(w, http.StatusOK, OrganizationResponse{
		ID:               org.ID.String(),
		Name:             org.Name,
		Slug:             org.Slug,
		PlanType:         org.PlanType,
		CreatedBy:        org.CreatedBy.String(),
		CreatorFirstName: org.CreatorFirstName,
		CreatorLastName:  org.CreatorLastName,
	})
}

func (h *OrganizationHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "User not found in context")
		return
	}

	userEmail, _ := GetUserEmail(r.Context())

	var orgs []*domain.Organization
	var err error

	if userEmail == "hasretisler0@gmail.com" {
		orgs, err = h.orgRepo.ListAll(r.Context())
	} else {
		orgs, err = h.orgRepo.GetUserOrganizations(r.Context(), userID)
	}

	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch organizations")
		return
	}

	response := make([]OrganizationResponse, 0, len(orgs))
	for _, org := range orgs {
		response = append(response, OrganizationResponse{
			ID:               org.ID.String(),
			Name:             org.Name,
			Slug:             org.Slug,
			PlanType:         org.PlanType,
			CreatedBy:        org.CreatedBy.String(),
			CreatorFirstName: org.CreatorFirstName,
			CreatorLastName:  org.CreatorLastName,
		})
	}

	RespondWithJSON(w, http.StatusOK, response)
}

func (h *OrganizationHandler) Select(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "User not found in context")
		return
	}

	userEmail, _ := GetUserEmail(r.Context())

	orgIDStr := chi.URLParam(r, "id")
	orgID, err := uuid.Parse(orgIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid organization ID")
		return
	}

	// Verify user is member of organization
	isMember, err := h.orgRepo.IsMember(r.Context(), userID, orgID)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to verify membership")
		return
	}

	if !isMember && userEmail != "hasretisler0@gmail.com" {
		RespondWithError(w, http.StatusForbidden, "Not a member of this organization")
		return
	}

	// Get organization details
	org, err := h.orgRepo.GetByID(r.Context(), orgID)
	if err != nil {
		RespondWithError(w, http.StatusNotFound, "Organization not found")
		return
	}

	// Get user's role and department in the organization
	query := `SELECT role, department FROM organization_members WHERE user_id = $1 AND organization_id = $2`
	var role, department string
	err = h.orgRepo.GetDB().QueryRowContext(r.Context(), query, userID, orgID).Scan(&role, &department)
	if err != nil {
		role = "member"
		department = "unassigned"
		// System admin bypass
		if userEmail == "hasretisler0@gmail.com" {
			role = "admin"
		}
	} else if userEmail == "hasretisler0@gmail.com" {
		role = "admin" // Ensure system admin always has admin role
	}

	// Generate new token with organization context, role and department
	token, err := service.GenerateTokenWithOrg(userID, userEmail, &orgID, role, department)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	// Ensure default chat channel exists
	go h.ensureDefaultChannel(r.Context(), orgID)

	RespondWithJSON(w, http.StatusOK, SelectOrganizationResponse{
		Token: token,
		Organization: OrganizationResponse{
			ID:               org.ID.String(),
			Name:             org.Name,
			Slug:             org.Slug,
			PlanType:         org.PlanType,
			CreatedBy:        org.CreatedBy.String(),
			CreatorFirstName: org.CreatorFirstName,
			CreatorLastName:  org.CreatorLastName,
		},
	})
}

type UpdateMemberRoleRequest struct {
	Role       string `json:"role"`
	Department string `json:"department"`
}

func (h *OrganizationHandler) UpdateMemberRole(w http.ResponseWriter, r *http.Request) {
	// Get current user and their role to verify admin status
	ctx := r.Context()
	if _, ok := GetUserID(ctx); !ok {
		RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	adminRole, _ := GetUserRole(ctx)
	adminEmail, _ := GetUserEmail(ctx)

	if adminRole != "admin" && adminEmail != "hasretisler0@gmail.com" {
		RespondWithError(w, http.StatusForbidden, "Only admins can change roles")
		return
	}

	orgIDStr := chi.URLParam(r, "id")
	orgID, _ := uuid.Parse(orgIDStr)

	targetUserIDStr := chi.URLParam(r, "userId")
	targetUserID, err := uuid.Parse(targetUserIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid target user ID")
		return
	}

	var req UpdateMemberRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate role
	validRoles := map[string]bool{"admin": true, "manager": true, "hr": true, "member": true}
	if !validRoles[req.Role] {
		RespondWithError(w, http.StatusBadRequest, "Invalid role. Use admin, manager, hr, or member")
		return
	}

	// Check if already a member
	isMember, err := h.orgRepo.IsMember(ctx, targetUserID, orgID)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}

	if !isMember {
		// Add as new member
		member := &domain.OrganizationMember{
			ID:             uuid.New(),
			OrganizationID: orgID,
			UserID:         targetUserID,
			Role:           req.Role,
			Department:     req.Department,
		}
		err = h.orgRepo.AddMember(ctx, member)
		// Trigger Activity
		if err == nil {
			var userName string
			h.orgRepo.GetDB().QueryRowContext(ctx, "SELECT first_name || ' ' || last_name FROM users WHERE id = $1", targetUserID).Scan(&userName)
			go h.notifyService.LogUserJoined(context.Background(), orgID, userName, targetUserID)
		}
	} else {
		// Update existing member role and department
		err = h.orgRepo.UpdateMemberRoleAndDepartment(ctx, orgID, targetUserID, req.Role, req.Department)
	}

	if err != nil {
		log.Printf("Error updating member role/department: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to update member")
		return
	}

	// Trigger Search Indexing for the user
	if h.indexer != nil {
		go func() {
			// Get user details for indexing (using userRepo if possible, but we don't have it here.
			// We can use a minimal fetch or pass userRepo too. Let's fetch minimally.)
			var u domain.User
			err := h.orgRepo.GetDB().QueryRowContext(context.Background(),
				"SELECT id, first_name, last_name, email, created_at FROM users WHERE id = $1",
				targetUserID).Scan(&u.ID, &u.FirstName, &u.LastName, &u.Email, &u.CreatedAt)
			if err == nil {
				h.indexer.IndexUser(context.Background(), &u, &orgID)
			}
		}()
	}

	w.WriteHeader(http.StatusOK)
}

func (h *OrganizationHandler) ensureDefaultChannel(ctx context.Context, orgID uuid.UUID) {
	// 1. Ensure 'Genel' channel exists
	genelQuery := `
		INSERT INTO chat_rooms (id, organization_id, name, type, created_at)
		SELECT $1, $2, 'Genel', 'channel', NOW()
		WHERE NOT EXISTS (
			SELECT 1 FROM chat_rooms WHERE organization_id = $2 AND name = 'Genel' AND type = 'channel'
		)
	`
	_, _ = h.orgRepo.GetDB().ExecContext(ctx, genelQuery, uuid.New(), orgID)

	// 2. Look for unique departments in this organization and create channels for them
	deptQuery := `
		INSERT INTO chat_rooms (id, organization_id, name, type, created_at)
		SELECT gen_random_uuid(), $1, department, 'channel', NOW()
		FROM (
			SELECT DISTINCT department 
			FROM organization_members 
			WHERE organization_id = $1 AND department != 'unassigned' AND department != ''
		) AS depts
		WHERE NOT EXISTS (
			SELECT 1 FROM chat_rooms WHERE organization_id = $1 AND name = depts.department AND type = 'channel'
		)
	`
	_, _ = h.orgRepo.GetDB().ExecContext(ctx, deptQuery, orgID)
}
