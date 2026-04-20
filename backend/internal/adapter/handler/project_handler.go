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

type ProjectHandler struct {
	repo    domain.ProjectRepository
	indexer *search.Indexer
}

func NewProjectHandler(repo domain.ProjectRepository, indexer *search.Indexer) *ProjectHandler {
	return &ProjectHandler{
		repo:    repo,
		indexer: indexer,
	}
}

type CreateProjectRequest struct {
	WorkspaceID string `json:"workspace_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      string `json:"status"` // active, completed, archived
}

type UpdateProjectRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      string `json:"status"`
}

type ProjectResponse struct {
	ID               string `json:"id"`
	OrganizationID   string `json:"organization_id"`
	WorkspaceID      string `json:"workspace_id"`
	Name             string `json:"name"`
	Description      string `json:"description"`
	Status           string `json:"status"`
	CreatedBy        string `json:"created_by"`
	CreatedAt        string `json:"created_at"`
	UpdatedAt        string `json:"updated_at"`
	CreatorFirstName string `json:"creator_first_name,omitempty"`
	CreatorLastName  string `json:"creator_last_name,omitempty"`
}

func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
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

	var req CreateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	if req.Name == "" {
		RespondWithError(w, http.StatusBadRequest, "Project name is required")
		return
	}

	if req.WorkspaceID == "" {
		RespondWithError(w, http.StatusBadRequest, "Workspace ID is required")
		return
	}

	workspaceID, err := uuid.Parse(req.WorkspaceID)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid workspace ID")
		return
	}

	status := req.Status
	if status == "" {
		status = "active"
	}

	project := &domain.Project{
		ID:             uuid.New(),
		OrganizationID: orgID,
		WorkspaceID:    workspaceID,
		Name:           req.Name,
		Description:    req.Description,
		Status:         status,
		CreatedBy:      userID,
	}

	if err := h.repo.Create(r.Context(), project); err != nil {
		log.Printf("Error creating project: %v", err)
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if h.indexer != nil {
		go h.indexer.IndexProject(context.Background(), project)
	}

	RespondWithJSON(w, http.StatusOK, ProjectResponse{
		ID:             project.ID.String(),
		OrganizationID: project.OrganizationID.String(),
		WorkspaceID:    project.WorkspaceID.String(),
		Name:           project.Name,
		Description:    project.Description,
		Status:         project.Status,
		CreatedBy:      project.CreatedBy.String(),
		CreatedAt:      project.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:      project.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		CreatorFirstName: project.CreatorFirstName,
		CreatorLastName:  project.CreatorLastName,
	})
}

func (h *ProjectHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID, ok := r.Context().Value(OrgIDKey).(uuid.UUID)
	if !ok {
		RespondWithError(w, http.StatusForbidden, "Organization context required")
		return
	}

	projects, err := h.repo.GetByOrganization(r.Context(), orgID)
	if err != nil {
		log.Printf("Error fetching projects: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch projects")
		return
	}

	response := make([]ProjectResponse, 0, len(projects))
	for _, p := range projects {
		response = append(response, ProjectResponse{
			ID:               p.ID.String(),
			OrganizationID:   p.OrganizationID.String(),
			WorkspaceID:      p.WorkspaceID.String(),
			Name:             p.Name,
			Description:      p.Description,
			Status:           p.Status,
			CreatedBy:        p.CreatedBy.String(),
			CreatedAt:        p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:        p.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
			CreatorFirstName: p.CreatorFirstName,
			CreatorLastName:  p.CreatorLastName,
		})
	}

	RespondWithJSON(w, http.StatusOK, response)
}

func (h *ProjectHandler) ListByWorkspace(w http.ResponseWriter, r *http.Request) {
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

	projects, err := h.repo.GetByWorkspace(r.Context(), workspaceID, orgID)
	if err != nil {
		log.Printf("Error fetching projects: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch projects")
		return
	}

	// Repository already filtered by organization ID
	response := make([]ProjectResponse, 0, len(projects))
	for _, p := range projects {
		response = append(response, ProjectResponse{
			ID:               p.ID.String(),
			OrganizationID:   p.OrganizationID.String(),
			WorkspaceID:      p.WorkspaceID.String(),
			Name:             p.Name,
			Description:      p.Description,
			Status:           p.Status,
			CreatedBy:        p.CreatedBy.String(),
			CreatedAt:        p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:        p.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
			CreatorFirstName: p.CreatorFirstName,
			CreatorLastName:  p.CreatorLastName,
		})
	}

	RespondWithJSON(w, http.StatusOK, response)
}

func (h *ProjectHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	orgID, ok := r.Context().Value(OrgIDKey).(uuid.UUID)
	if !ok {
		RespondWithError(w, http.StatusForbidden, "Organization context required")
		return
	}

	projectIDStr := chi.URLParam(r, "id")
	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid project ID")
		return
	}

	project, err := h.repo.GetByID(r.Context(), projectID, orgID)
	if err != nil {
		if err == sql.ErrNoRows {
			RespondWithError(w, http.StatusNotFound, "Project not found")
			return
		}
		log.Printf("Error fetching project: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch project")
		return
	}

	RespondWithJSON(w, http.StatusOK, ProjectResponse{
		ID:             project.ID.String(),
		OrganizationID: project.OrganizationID.String(),
		WorkspaceID:    project.WorkspaceID.String(),
		Name:           project.Name,
		Description:    project.Description,
		Status:         project.Status,
		CreatedBy:      project.CreatedBy.String(),
		CreatedAt:      project.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:      project.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		CreatorFirstName: project.CreatorFirstName,
		CreatorLastName:  project.CreatorLastName,
	})
}

func (h *ProjectHandler) Update(w http.ResponseWriter, r *http.Request) {
	orgID, ok := r.Context().Value(OrgIDKey).(uuid.UUID)
	if !ok {
		RespondWithError(w, http.StatusForbidden, "Organization context required")
		return
	}

	projectIDStr := chi.URLParam(r, "id")
	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid project ID")
		return
	}

	var req UpdateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	// Verify project exists and belongs to organization
	project, err := h.repo.GetByID(r.Context(), projectID, orgID)
	if err != nil {
		RespondWithError(w, http.StatusNotFound, "Project not found")
		return
	}

	project.Name = req.Name
	project.Description = req.Description
	project.Status = req.Status

	if err := h.repo.Update(r.Context(), project, orgID); err != nil {
		log.Printf("Error updating project: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to update project")
		return
	}

	if h.indexer != nil {
		go h.indexer.IndexProject(context.Background(), project)
	}

	RespondWithJSON(w, http.StatusOK, ProjectResponse{
		ID:             project.ID.String(),
		OrganizationID: project.OrganizationID.String(),
		WorkspaceID:    project.WorkspaceID.String(),
		Name:           project.Name,
		Description:    project.Description,
		Status:         project.Status,
		CreatedBy:      project.CreatedBy.String(),
		CreatedAt:      project.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:      project.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		CreatorFirstName: project.CreatorFirstName,
		CreatorLastName:  project.CreatorLastName,
	})
}

func (h *ProjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	orgID, ok := r.Context().Value(OrgIDKey).(uuid.UUID)
	if !ok {
		RespondWithError(w, http.StatusForbidden, "Organization context required")
		return
	}

	projectIDStr := chi.URLParam(r, "id")
	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid project ID")
		return
	}

	// Verify project exists and belongs to organization
	if _, err := h.repo.GetByID(r.Context(), projectID, orgID); err != nil {
		RespondWithError(w, http.StatusNotFound, "Project not found")
		return
	}

	if err := h.repo.Delete(r.Context(), projectID, orgID); err != nil {
		log.Printf("Error deleting project: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to delete project")
		return
	}

	if h.indexer != nil {
		go h.indexer.RemoveProject(context.Background(), projectID)
	}

	w.WriteHeader(http.StatusNoContent)
}
