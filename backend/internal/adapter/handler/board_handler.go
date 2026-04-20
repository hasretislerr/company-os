package handler

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
	"github.com/hasret/company-os/backend/internal/service"
)

type BoardHandler struct {
	repo          domain.BoardRepository
	notifyService *service.NotificationService
}

func NewBoardHandler(repo domain.BoardRepository, notifyService *service.NotificationService) *BoardHandler {
	return &BoardHandler{
		repo:          repo,
		notifyService: notifyService,
	}
}

type CreateBoardRequest struct {
	ProjectID   string   `json:"project_id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Type        string   `json:"type"` // kanban, scrum
	Columns     []string `json:"columns,omitempty"`
}

type UpdateBoardRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
}

type BoardResponse struct {
	ID               string           `json:"id"`
	ProjectID        string           `json:"project_id"`
	Name             string           `json:"name"`
	Description      string           `json:"description"`
	Type             string           `json:"type"`
	CreatedBy        string           `json:"created_by"`
	CreatedAt        string           `json:"created_at"`
	UpdatedAt        string           `json:"updated_at"`
	CreatorFirstName string           `json:"creator_first_name,omitempty"`
	CreatorLastName  string           `json:"creator_last_name,omitempty"`
	CreatorAvatarURL string           `json:"creator_avatar_url,omitempty"`
	Columns          []ColumnResponse `json:"columns,omitempty"`
}

type ColumnResponse struct {
	ID       string `json:"id"`
	BoardID  string `json:"board_id"`
	Name     string `json:"name"`
	Position int    `json:"position"`
}

type CreateColumnRequest struct {
	Name     string `json:"name"`
	Position int    `json:"position"`
}

type UpdateColumnRequest struct {
	Name     string `json:"name"`
	Position int    `json:"position"`
}

func (h *BoardHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "User not found in context")
		return
	}

	_ = r.Context().Value(OrgIDKey) // Org context required by middleware

	var req CreateBoardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	if req.Name == "" || req.ProjectID == "" {
		RespondWithError(w, http.StatusBadRequest, "Board name and project ID are required")
		return
	}

	projectID, err := uuid.Parse(req.ProjectID)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid project ID")
		return
	}

	boardType := req.Type
	if boardType == "" {
		boardType = "kanban"
	}

	orgID, ok := GetOrgID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusForbidden, "Organization ID missing")
		return
	}

	board := &domain.Board{
		ID:             uuid.New(),
		OrganizationID: orgID,
		ProjectID:      projectID,
		Name:           req.Name,
		Description:    req.Description,
		Type:           boardType,
		CreatedBy:      userID,
	}

	if err := h.repo.Create(r.Context(), board); err != nil {
		log.Printf("Error creating board: %v", err)
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Create default columns if provided, otherwise create standard Kanban columns
	columns := req.Columns
	if len(columns) == 0 {
		columns = []string{"Yapılacak", "Devam Ediyor", "Tamamlandı"}
	}

	for i, colName := range columns {
		column := &domain.BoardColumn{
			ID:             uuid.New(),
			OrganizationID: orgID,
			BoardID:        board.ID,
			Name:           colName,
			Position:       i,
		}
		if err := h.repo.CreateColumn(r.Context(), column); err != nil {
			log.Printf("Error creating column: %v", err)
		}
	}

	// Fetch columns to return
	cols, _ := h.repo.GetColumnsByBoard(r.Context(), board.ID, orgID)
	colResponses := make([]ColumnResponse, 0, len(cols))
	for _, col := range cols {
		colResponses = append(colResponses, ColumnResponse{
			ID:       col.ID.String(),
			BoardID:  col.BoardID.String(),
			Name:     col.Name,
			Position: col.Position,
		})
	}

	fullBoard, err := h.repo.GetByID(r.Context(), board.ID, orgID)
	if err != nil {
		fullBoard = board
	}

	RespondWithJSON(w, http.StatusOK, BoardResponse{
		ID:          fullBoard.ID.String(),
		ProjectID:   fullBoard.ProjectID.String(),
		Name:        fullBoard.Name,
		Description: fullBoard.Description,
		Type:        fullBoard.Type,
		CreatedBy:   fullBoard.CreatedBy.String(),
		CreatedAt:   fullBoard.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   fullBoard.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		CreatorFirstName: fullBoard.CreatorFirstName,
		CreatorLastName:  fullBoard.CreatorLastName,
		CreatorAvatarURL: fullBoard.CreatorAvatarURL,
		Columns:          colResponses,
	})
}

func (h *BoardHandler) ListByProject(w http.ResponseWriter, r *http.Request) {
	_ = r.Context().Value(OrgIDKey) // Org context required by middleware

	projectIDStr := chi.URLParam(r, "id")
	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid project ID")
		return
	}

	orgID, _ := GetOrgID(r.Context())
	boards, err := h.repo.GetByProject(r.Context(), projectID, orgID)
	if err != nil {
		log.Printf("Error fetching boards: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch boards")
		return
	}

	response := make([]BoardResponse, 0, len(boards))
	for _, b := range boards {
		// Fetch columns for each board
		cols, err := h.repo.GetColumnsByBoard(r.Context(), b.ID, orgID)
		if err != nil {
			log.Printf("Error fetching columns for board %s: %v", b.ID, err)
			cols = []*domain.BoardColumn{}
		}

		colResponses := make([]ColumnResponse, 0, len(cols))
		for _, col := range cols {
			colResponses = append(colResponses, ColumnResponse{
				ID:       col.ID.String(),
				BoardID:  col.BoardID.String(),
				Name:     col.Name,
				Position: col.Position,
			})
		}

		response = append(response, BoardResponse{
			ID:               b.ID.String(),
			ProjectID:        b.ProjectID.String(),
			Name:             b.Name,
			Description:      b.Description,
			Type:             b.Type,
			CreatedBy:        b.CreatedBy.String(),
			CreatedAt:        b.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:        b.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
			CreatorFirstName: b.CreatorFirstName,
			CreatorLastName:  b.CreatorLastName,
			Columns:          colResponses,
		})
	}

	RespondWithJSON(w, http.StatusOK, response)
}

func (h *BoardHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	_ = r.Context().Value(OrgIDKey) // Org context required by middleware

	boardIDStr := chi.URLParam(r, "id")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid board ID")
		return
	}

	orgID, _ := GetOrgID(r.Context())
	board, err := h.repo.GetByID(r.Context(), boardID, orgID)
	if err != nil {
		if err == sql.ErrNoRows {
			RespondWithError(w, http.StatusNotFound, "Board not found")
			return
		}
		log.Printf("Error fetching board: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch board")
		return
	}

	// Fetch columns
	cols, err := h.repo.GetColumnsByBoard(r.Context(), boardID, orgID)
	if err != nil {
		log.Printf("Error fetching columns: %v", err)
		cols = []*domain.BoardColumn{}
	}

	colResponses := make([]ColumnResponse, 0, len(cols))
	for _, col := range cols {
		colResponses = append(colResponses, ColumnResponse{
			ID:       col.ID.String(),
			BoardID:  col.BoardID.String(),
			Name:     col.Name,
			Position: col.Position,
		})
	}

	RespondWithJSON(w, http.StatusOK, BoardResponse{
		ID:          board.ID.String(),
		ProjectID:   board.ProjectID.String(),
		Name:        board.Name,
		Description: board.Description,
		Type:        board.Type,
		CreatedBy:   board.CreatedBy.String(),
		CreatedAt:   board.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:      board.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		CreatorFirstName: board.CreatorFirstName,
		CreatorLastName:  board.CreatorLastName,
		Columns:     colResponses,
	})
}

func (h *BoardHandler) Update(w http.ResponseWriter, r *http.Request) {
	_ = r.Context().Value(OrgIDKey) // Org context required by middleware

	boardIDStr := chi.URLParam(r, "id")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid board ID")
		return
	}

	var req UpdateBoardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	orgID, _ := GetOrgID(r.Context())
	board, err := h.repo.GetByID(r.Context(), boardID, orgID)
	if err != nil {
		RespondWithError(w, http.StatusNotFound, "Board not found")
		return
	}

	board.Name = req.Name
	board.Description = req.Description
	board.Type = req.Type

	if err := h.repo.Update(r.Context(), board, orgID); err != nil {
		log.Printf("Error updating board: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to update board")
		return
	}

	RespondWithJSON(w, http.StatusOK, BoardResponse{
		ID:               board.ID.String(),
		ProjectID:        board.ProjectID.String(),
		Name:             board.Name,
		Description:      board.Description,
		Type:             board.Type,
		CreatedBy:        board.CreatedBy.String(),
		CreatedAt:        board.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:        board.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		CreatorFirstName: board.CreatorFirstName,
		CreatorLastName:  board.CreatorLastName,
	})
}

func (h *BoardHandler) Delete(w http.ResponseWriter, r *http.Request) {
	_ = r.Context().Value(OrgIDKey) // Org context required by middleware

	boardIDStr := chi.URLParam(r, "id")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid board ID")
		return
	}

	orgID, _ := GetOrgID(r.Context())
	if err := h.repo.Delete(r.Context(), boardID, orgID); err != nil {
		log.Printf("Error deleting board: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to delete board")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *BoardHandler) CreateColumn(w http.ResponseWriter, r *http.Request) {
	orgID, ok := GetOrgID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusForbidden, "Organization ID missing")
		return
	}

	boardIDStr := chi.URLParam(r, "id")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid board ID")
		return
	}

	var req CreateColumnRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	column := &domain.BoardColumn{
		ID:             uuid.New(),
		OrganizationID: orgID,
		BoardID:        boardID,
		Name:           req.Name,
		Position:       req.Position,
	}

	if err := h.repo.CreateColumn(r.Context(), column); err != nil {
		log.Printf("Error creating column: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to create column")
		return
	}

	RespondWithJSON(w, http.StatusOK, ColumnResponse{
		ID:       column.ID.String(),
		BoardID:  column.BoardID.String(),
		Name:     column.Name,
		Position: column.Position,
	})
}

func (h *BoardHandler) UpdateColumn(w http.ResponseWriter, r *http.Request) {
	orgID, ok := GetOrgID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusForbidden, "Organization ID missing")
		return
	}

	columnIDStr := chi.URLParam(r, "columnId")
	columnID, err := uuid.Parse(columnIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid column ID")
		return
	}

	var req UpdateColumnRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	column, err := h.repo.GetColumnByID(r.Context(), columnID, orgID)
	if err != nil {
		RespondWithError(w, http.StatusNotFound, "Column not found")
		return
	}

	column.Name = req.Name
	column.Position = req.Position

	if err := h.repo.UpdateColumn(r.Context(), column, orgID); err != nil {
		log.Printf("Error updating column: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to update column")
		return
	}

	RespondWithJSON(w, http.StatusOK, ColumnResponse{
		ID:       column.ID.String(),
		BoardID:  column.BoardID.String(),
		Name:     column.Name,
		Position: column.Position,
	})
}

func (h *BoardHandler) DeleteColumn(w http.ResponseWriter, r *http.Request) {
	orgID, ok := GetOrgID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusForbidden, "Organization ID missing")
		return
	}

	columnIDStr := chi.URLParam(r, "id")
	columnID, err := uuid.Parse(columnIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid column ID")
		return
	}

	if err := h.repo.DeleteColumn(r.Context(), columnID, orgID); err != nil {
		log.Printf("Error deleting column: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to delete column")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
