package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/adapter/search"
	"github.com/hasret/company-os/backend/internal/domain"
)

type WorkspaceHandler struct {
	repo    domain.WorkspaceRepository
	indexer *search.Indexer
}

func NewWorkspaceHandler(repo domain.WorkspaceRepository, indexer *search.Indexer) *WorkspaceHandler {
	return &WorkspaceHandler{
		repo:    repo,
		indexer: indexer,
	}
}

type CreateWorkspaceRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type UpdateWorkspaceRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type WorkspaceResponse struct {
	ID               string `json:"id"`
	OrganizationID   string `json:"organization_id"`
	Name             string `json:"name"`
	Description      string `json:"description"`
	CreatedBy        string `json:"created_by"`
	CreatedAt        string `json:"created_at"`
	UpdatedAt        string `json:"updated_at"`
	CreatorFirstName string `json:"creator_first_name,omitempty"`
	CreatorLastName  string `json:"creator_last_name,omitempty"`
}

func (h *WorkspaceHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "User not found in context")
		return
	}

	orgID, ok := r.Context().Value(OrgIDKey).(uuid.UUID)
	if !ok {
		RespondWithError(w, http.StatusForbidden, "Organization context required")
		return
	}

	var req CreateWorkspaceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	if req.Name == "" {
		RespondWithError(w, http.StatusBadRequest, "Workspace name is required")
		return
	}

	workspace := &domain.Workspace{
		ID:             uuid.New(),
		OrganizationID: orgID,
		Name:           req.Name,
		Description:    req.Description,
		CreatedBy:      userID,
	}

	if err := h.repo.Create(r.Context(), workspace); err != nil {
		log.Printf("Error creating workspace: %v", err)
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if h.indexer != nil {
		go h.indexer.IndexWorkspace(context.Background(), workspace)
	}

	RespondWithJSON(w, http.StatusOK, WorkspaceResponse{
		ID:               workspace.ID.String(),
		OrganizationID:   workspace.OrganizationID.String(),
		Name:             workspace.Name,
		Description:      workspace.Description,
		CreatedBy:        workspace.CreatedBy.String(),
		CreatedAt:        workspace.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:        workspace.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		CreatorFirstName: workspace.CreatorFirstName,
		CreatorLastName:  workspace.CreatorLastName,
	})
}

func (h *WorkspaceHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID, ok := r.Context().Value(OrgIDKey).(uuid.UUID)
	if !ok {
		RespondWithError(w, http.StatusForbidden, "Organization context required")
		return
	}

	workspaces, err := h.repo.GetByOrganization(r.Context(), orgID)
	if err != nil {
		log.Printf("Error fetching workspaces: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch workspaces")
		return
	}

	response := make([]WorkspaceResponse, 0, len(workspaces))
	for _, ws := range workspaces {
		response = append(response, WorkspaceResponse{
			ID:               ws.ID.String(),
			OrganizationID:   ws.OrganizationID.String(),
			Name:             ws.Name,
			Description:      ws.Description,
			CreatedBy:        ws.CreatedBy.String(),
			CreatedAt:        ws.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:        ws.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
			CreatorFirstName: ws.CreatorFirstName,
			CreatorLastName:  ws.CreatorLastName,
		})
	}

	RespondWithJSON(w, http.StatusOK, response)
}

func (h *WorkspaceHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	orgID, ok := r.Context().Value(OrgIDKey).(uuid.UUID)
	if !ok {
		RespondWithError(w, http.StatusForbidden, "Organization context required")
		return
	}

	workspaceIDStr := chi.URLParam(r, "id")
	workspaceID, err := uuid.Parse(workspaceIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid workspace ID")
		return
	}

	workspace, err := h.repo.GetByID(r.Context(), workspaceID, orgID)
	if err != nil {
		if err == sql.ErrNoRows {
			RespondWithError(w, http.StatusNotFound, "Workspace not found")
			return
		}
		log.Printf("Error fetching workspace: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch workspace")
		return
	}

	RespondWithJSON(w, http.StatusOK, WorkspaceResponse{
		ID:               workspace.ID.String(),
		OrganizationID:   workspace.OrganizationID.String(),
		Name:             workspace.Name,
		Description:      workspace.Description,
		CreatedBy:        workspace.CreatedBy.String(),
		CreatedAt:        workspace.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:        workspace.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		CreatorFirstName: workspace.CreatorFirstName,
		CreatorLastName:  workspace.CreatorLastName,
	})
}

func (h *WorkspaceHandler) Update(w http.ResponseWriter, r *http.Request) {
	orgID, ok := r.Context().Value(OrgIDKey).(uuid.UUID)
	if !ok {
		RespondWithError(w, http.StatusForbidden, "Organization context required")
		return
	}

	workspaceIDStr := chi.URLParam(r, "id")
	workspaceID, err := uuid.Parse(workspaceIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid workspace ID")
		return
	}

	var req UpdateWorkspaceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	// Verify workspace exists and belongs to organization
	workspace, err := h.repo.GetByID(r.Context(), workspaceID, orgID)
	if err != nil {
		RespondWithError(w, http.StatusNotFound, "Workspace not found")
		return
	}

	workspace.Name = req.Name
	workspace.Description = req.Description

	if err := h.repo.Update(r.Context(), workspace, orgID); err != nil {
		log.Printf("Error updating workspace: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to update workspace")
		return
	}

	if h.indexer != nil {
		go h.indexer.IndexWorkspace(context.Background(), workspace)
	}

	RespondWithJSON(w, http.StatusOK, WorkspaceResponse{
		ID:               workspace.ID.String(),
		OrganizationID:   workspace.OrganizationID.String(),
		Name:             workspace.Name,
		Description:      workspace.Description,
		CreatedBy:        workspace.CreatedBy.String(),
		CreatedAt:        workspace.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:        workspace.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		CreatorFirstName: workspace.CreatorFirstName,
		CreatorLastName:  workspace.CreatorLastName,
	})
}

func (h *WorkspaceHandler) Delete(w http.ResponseWriter, r *http.Request) {
	orgID, ok := r.Context().Value(OrgIDKey).(uuid.UUID)
	if !ok {
		RespondWithError(w, http.StatusForbidden, "Organization context required")
		return
	}

	workspaceIDStr := chi.URLParam(r, "id")
	workspaceID, err := uuid.Parse(workspaceIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid workspace ID")
		return
	}

	// Verify workspace exists and belongs to organization
	if _, err := h.repo.GetByID(r.Context(), workspaceID, orgID); err != nil {
		RespondWithError(w, http.StatusNotFound, "Workspace not found")
		return
	}

	if err := h.repo.Delete(r.Context(), workspaceID, orgID); err != nil {
		log.Printf("Error deleting workspace: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to delete workspace")
		return
	}

	if h.indexer != nil {
		go h.indexer.RemoveWorkspace(context.Background(), workspaceID)
	}

	w.WriteHeader(http.StatusNoContent)
}
