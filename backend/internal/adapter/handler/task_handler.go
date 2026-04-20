package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/adapter/search"
	"github.com/hasret/company-os/backend/internal/domain"
	"github.com/hasret/company-os/backend/internal/service"
)

type TaskHandler struct {
	repo          domain.TaskRepository
	boardRepo     domain.BoardRepository
	userRepo      domain.UserRepository
	notifyService *service.NotificationService
	indexer       *search.Indexer
}

func NewTaskHandler(repo domain.TaskRepository, boardRepo domain.BoardRepository, userRepo domain.UserRepository, notifyService *service.NotificationService, indexer *search.Indexer) *TaskHandler {
	return &TaskHandler{
		repo:          repo,
		boardRepo:     boardRepo,
		userRepo:      userRepo,
		notifyService: notifyService,
		indexer:       indexer,
	}
}

type CreateTaskRequest struct {
	BoardID     string  `json:"board_id"`
	ColumnID    string  `json:"column_id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Priority    string  `json:"priority"` // low, medium, high, critical
	AssigneeID  *string `json:"assignee_id,omitempty"`
	DueDate     *string `json:"due_date,omitempty"`
	Position    int     `json:"position"`
}

type UpdateTaskRequest struct {
	ColumnID    string  `json:"column_id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Priority    string  `json:"priority"`
	AssigneeID  *string `json:"assignee_id,omitempty"`
	DueDate     *string `json:"due_date,omitempty"`
	Position    int     `json:"position"`
}

type TaskResponse struct {
	ID          string        `json:"id"`
	BoardID     string        `json:"board_id"`
	ColumnID    string        `json:"column_id"`
	ColumnName  string        `json:"column_name"`
	Title       string        `json:"title"`
	Description string        `json:"description"`
	Priority    string        `json:"priority"`
	AssigneeID  *string       `json:"assignee_id,omitempty"`
	Assignee    *UserResponse `json:"assignee,omitempty"`
	Creator     *UserResponse `json:"creator,omitempty"`
	DueDate     *string       `json:"due_date,omitempty"`
	Position    int           `json:"position"`
	CreatedBy   string        `json:"created_by"`
	CreatedAt   string        `json:"created_at"`
	UpdatedAt   string        `json:"updated_at"`
}

func (h *TaskHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "User not found in context")
		return
	}

	_ = r.Context().Value(OrgIDKey) // Org context required by middleware

	var req CreateTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	if req.Title == "" || req.BoardID == "" || req.ColumnID == "" {
		RespondWithError(w, http.StatusBadRequest, "Task title, board ID, and column ID are required")
		return
	}

	boardID, err := uuid.Parse(req.BoardID)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid board ID")
		return
	}

	columnID, err := uuid.Parse(req.ColumnID)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid column ID")
		return
	}

	priority := req.Priority
	if priority == "" {
		priority = "medium"
	}

	orgID, ok := GetOrgID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusForbidden, "Organization ID missing")
		return
	}

	task := &domain.Task{
		ID:             uuid.New(),
		OrganizationID: orgID,
		BoardID:        boardID,
		ColumnID:       columnID,
		Title:          req.Title,
		Description:    req.Description,
		Priority:       priority,
		Position:       req.Position,
		CreatedBy:      userID,
	}

	if req.AssigneeID != nil {
		assigneeID, err := uuid.Parse(*req.AssigneeID)
		if err == nil {
			task.AssigneeID = &assigneeID
		}
	}

	if req.DueDate != nil {
		dueDate, err := time.Parse("2006-01-02", *req.DueDate)
		if err == nil {
			task.DueDate = &dueDate
		}
	}

	if err := h.repo.Create(r.Context(), task); err != nil {
		log.Printf("Error creating task: %v", err)
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Trigger Notification
	orgID, _ = GetOrgID(r.Context())
	performerName := "Bir kullanıcı"

	performer, err := h.userRepo.GetByID(r.Context(), userID)
	if err == nil && performer != nil {
		task.Creator = performer
		performerName = performer.FirstName + " " + performer.LastName
	}

	go h.notifyService.NotifyTaskAssigned(context.Background(), task, orgID, performerName)

	if h.indexer != nil {
		go h.indexer.IndexTask(context.Background(), task, orgID)
	}

	response := TaskResponse{
		ID:          task.ID.String(),
		BoardID:     task.BoardID.String(),
		ColumnID:    task.ColumnID.String(),
		Title:       task.Title,
		Description: task.Description,
		Priority:    task.Priority,
		Position:    task.Position,
		CreatedBy:   task.CreatedBy.String(),
		CreatedAt:   task.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   task.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if task.AssigneeID != nil {
		assigneeStr := task.AssigneeID.String()
		response.AssigneeID = &assigneeStr
	}

	if task.Assignee != nil {
		response.Assignee = &UserResponse{
			ID:        task.Assignee.ID.String(),
			Email:     task.Assignee.Email,
			FirstName: task.Assignee.FirstName,
			LastName:  task.Assignee.LastName,
		}
	}

	if task.Creator != nil {
		response.Creator = &UserResponse{
			ID:        task.Creator.ID.String(),
			Email:     task.Creator.Email,
			FirstName: task.Creator.FirstName,
			LastName:  task.Creator.LastName,
		}
	}

	if task.DueDate != nil {
		dueDateStr := task.DueDate.Format("2006-01-02")
		response.DueDate = &dueDateStr
	}

	RespondWithJSON(w, http.StatusOK, response)
}

func (h *TaskHandler) ListByBoard(w http.ResponseWriter, r *http.Request) {
	_ = r.Context().Value(OrgIDKey) // Org context required by middleware

	boardIDStr := chi.URLParam(r, "id")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid board ID")
		return
	}

	orgID, _ := GetOrgID(r.Context())
	// Join with boards and columns to get column names
	query := `
		SELECT 
			t.id, t.organization_id, t.board_id, t.column_id, t.title, t.description, t.priority, t.assignee_id, t.due_date, t.position, t.created_by, t.created_at, t.updated_at, t.deleted_at,
			u.id, u.first_name, u.last_name, u.email,
			c.id, c.first_name, c.last_name, c.email,
			col.name as column_name
		FROM tasks t
		LEFT JOIN users u ON t.assignee_id = u.id
		LEFT JOIN users c ON t.created_by = c.id
		LEFT JOIN board_columns col ON t.column_id = col.id
		WHERE t.board_id = $1 AND t.organization_id = $2 AND t.deleted_at IS NULL
		ORDER BY t.position ASC, t.created_at DESC
	`
	rows, err := h.repo.GetDB().QueryContext(r.Context(), query, boardID, orgID)
	if err != nil {
		log.Printf("Error fetching tasks: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch tasks")
		return
	}
	defer rows.Close()

	response := make([]TaskResponse, 0)
	for rows.Next() {
		t := &domain.Task{}
		var uID, cID uuid.NullUUID
		var uFirstName, uLastName, uEmail, cFirstName, cLastName, cEmail sql.NullString
		var columnName sql.NullString

		err := rows.Scan(
			&t.ID, &t.OrganizationID, &t.BoardID, &t.ColumnID, &t.Title, &t.Description, &t.Priority, &t.AssigneeID, &t.DueDate, &t.Position, &t.CreatedBy, &t.CreatedAt, &t.UpdatedAt, &t.DeletedAt,
			&uID, &uFirstName, &uLastName, &uEmail,
			&cID, &cFirstName, &cLastName, &cEmail,
			&columnName,
		)
		if err != nil {
			log.Printf("Error scanning task: %v", err)
			continue
		}

		taskResp := TaskResponse{
			ID:          t.ID.String(),
			BoardID:     t.BoardID.String(),
			ColumnID:    t.ColumnID.String(),
			ColumnName:  columnName.String,
			Title:       t.Title,
			Description: t.Description,
			Priority:    t.Priority,
			Position:    t.Position,
			CreatedBy:   t.CreatedBy.String(),
			CreatedAt:   t.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:   t.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}

		if t.AssigneeID != nil {
			assigneeStr := t.AssigneeID.String()
			taskResp.AssigneeID = &assigneeStr
		}

		if t.Assignee != nil {
			taskResp.Assignee = &UserResponse{
				ID:        t.Assignee.ID.String(),
				Email:     t.Assignee.Email,
				FirstName: t.Assignee.FirstName,
				LastName:  t.Assignee.LastName,
			}
		}

		if t.Creator != nil {
			taskResp.Creator = &UserResponse{
				ID:        t.Creator.ID.String(),
				Email:     t.Creator.Email,
				FirstName: t.Creator.FirstName,
				LastName:  t.Creator.LastName,
			}
		}

		if t.DueDate != nil {
			dueDateStr := t.DueDate.Format("2006-01-02")
			taskResp.DueDate = &dueDateStr
		}

		response = append(response, taskResp)
	}

	RespondWithJSON(w, http.StatusOK, response)
}

func (h *TaskHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	taskIDStr := chi.URLParam(r, "id")
	taskID, err := uuid.Parse(taskIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid task ID")
		return
	}

	orgID, _ := GetOrgID(r.Context())
	task, err := h.repo.GetByID(r.Context(), taskID, orgID)
	if err != nil {
		if err == sql.ErrNoRows {
			RespondWithError(w, http.StatusNotFound, "Task not found")
			return
		}
		log.Printf("Error fetching task: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch task")
		return
	}

	response := TaskResponse{
		ID:          task.ID.String(),
		BoardID:     task.BoardID.String(),
		ColumnID:    task.ColumnID.String(),
		Title:       task.Title,
		Description: task.Description,
		Priority:    task.Priority,
		Position:    task.Position,
		CreatedBy:   task.CreatedBy.String(),
		CreatedAt:   task.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   task.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if task.AssigneeID != nil {
		assigneeStr := task.AssigneeID.String()
		response.AssigneeID = &assigneeStr
	}

	if task.Assignee != nil {
		response.Assignee = &UserResponse{
			ID:        task.Assignee.ID.String(),
			Email:     task.Assignee.Email,
			FirstName: task.Assignee.FirstName,
			LastName:  task.Assignee.LastName,
		}
	}

	if task.Creator != nil {
		response.Creator = &UserResponse{
			ID:        task.Creator.ID.String(),
			Email:     task.Creator.Email,
			FirstName: task.Creator.FirstName,
			LastName:  task.Creator.LastName,
		}
	}

	if task.DueDate != nil {
		dueDateStr := task.DueDate.Format("2006-01-02")
		response.DueDate = &dueDateStr
	}

	RespondWithJSON(w, http.StatusOK, response)
}

func (h *TaskHandler) Update(w http.ResponseWriter, r *http.Request) {
	_ = r.Context().Value(OrgIDKey) // Org context required by middleware

	taskIDStr := chi.URLParam(r, "id")
	taskID, err := uuid.Parse(taskIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid task ID")
		return
	}

	var req UpdateTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	orgID, _ := GetOrgID(r.Context())
	task, err := h.repo.GetByID(r.Context(), taskID, orgID)
	if err != nil {
		if err == sql.ErrNoRows {
			RespondWithError(w, http.StatusNotFound, "Task not found")
		} else {
			log.Printf("Error fetching task for update: %v", err)
			RespondWithError(w, http.StatusInternalServerError, "Failed to fetch task")
		}
		return
	}

	columnID, err := uuid.Parse(req.ColumnID)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid column ID")
		return
	}

	// Log movement if column changed
	if req.ColumnID != task.ColumnID.String() {
		orgID, _ := GetOrgID(r.Context())
		userID, _ := GetUserID(r.Context())

		var performerName, oldColName, newColName string
		performer, _ := h.userRepo.GetByID(r.Context(), userID)
		if performer != nil {
			performerName = performer.FirstName + " " + performer.LastName
		}

		oldCol, _ := h.boardRepo.GetColumnByID(r.Context(), task.ColumnID, orgID)
		if oldCol != nil {
			oldColName = oldCol.Name
		}

		newCol, _ := h.boardRepo.GetColumnByID(r.Context(), columnID, orgID)
		if newCol != nil {
			newColName = newCol.Name
		}

		go h.notifyService.LogTaskMovement(context.Background(), orgID, task.Title, oldColName, newColName, performerName, task.ID)
	}

	task.ColumnID = columnID
	task.Title = req.Title
	task.Description = req.Description
	task.Priority = req.Priority
	task.Position = req.Position

	if req.AssigneeID != nil {
		assigneeID, err := uuid.Parse(*req.AssigneeID)
		if err == nil {
			// Trigger notification if assignee changed
			if task.AssigneeID == nil || *task.AssigneeID != assigneeID {
				orgID, _ := GetOrgID(r.Context())
				userID, _ := GetUserID(r.Context())
				var performerName string
				performer, _ := h.userRepo.GetByID(r.Context(), userID)
				if performer != nil {
					performerName = performer.FirstName + " " + performer.LastName
				}
				
				// Fetch target user for notification info
				targetUser, _ := h.userRepo.GetByID(r.Context(), assigneeID)
				if targetUser != nil {
					task.Assignee = targetUser
				}

				go h.notifyService.NotifyTaskAssigned(context.Background(), task, orgID, performerName)
			}
			task.AssigneeID = &assigneeID
		}
	} else {
		task.AssigneeID = nil
	}

	if req.DueDate != nil {
		dueDate, err := time.Parse("2006-01-02", *req.DueDate)
		if err == nil {
			task.DueDate = &dueDate
		}
	} else {
		task.DueDate = nil
	}

	if err := h.repo.Update(r.Context(), task, orgID); err != nil {
		log.Printf("Error updating task: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to update task")
		return
	}

	if h.indexer != nil {
		orgID, _ := GetOrgID(r.Context())
		go h.indexer.IndexTask(context.Background(), task, orgID)
	}

	response := TaskResponse{
		ID:          task.ID.String(),
		BoardID:     task.BoardID.String(),
		ColumnID:    task.ColumnID.String(),
		Title:       task.Title,
		Description: task.Description,
		Priority:    task.Priority,
		Position:    task.Position,
		CreatedBy:   task.CreatedBy.String(),
		CreatedAt:   task.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   task.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if task.AssigneeID != nil {
		assigneeStr := task.AssigneeID.String()
		response.AssigneeID = &assigneeStr
	}

	if task.Assignee != nil {
		response.Assignee = &UserResponse{
			ID:        task.Assignee.ID.String(),
			Email:     task.Assignee.Email,
			FirstName: task.Assignee.FirstName,
			LastName:  task.Assignee.LastName,
		}
	}

	if task.Creator != nil {
		response.Creator = &UserResponse{
			ID:        task.Creator.ID.String(),
			Email:     task.Creator.Email,
			FirstName: task.Creator.FirstName,
			LastName:  task.Creator.LastName,
		}
	}

	if task.DueDate != nil {
		dueDateStr := task.DueDate.Format("2006-01-02")
		response.DueDate = &dueDateStr
	}

	RespondWithJSON(w, http.StatusOK, response)
}

func (h *TaskHandler) Delete(w http.ResponseWriter, r *http.Request) {
	_ = r.Context().Value(OrgIDKey) // Org context required by middleware

	taskIDStr := chi.URLParam(r, "id")
	taskID, err := uuid.Parse(taskIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid task ID")
		return
	}

	orgID, _ := GetOrgID(r.Context())
	if err := h.repo.Delete(r.Context(), taskID, orgID); err != nil {
		log.Printf("Error deleting task: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to delete task")
		return
	}

	if h.indexer != nil {
		go h.indexer.RemoveTask(context.Background(), taskID)
	}

	w.WriteHeader(http.StatusNoContent)
}
func (h *TaskHandler) GetMyTasks(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "User not found in context")
		return
	}

	orgID, _ := GetOrgID(r.Context())
	// Modified query to include column name
	query := `
		SELECT 
			t.id, t.organization_id, t.board_id, t.column_id, t.title, t.description, t.priority, t.assignee_id, t.due_date, t.position, t.created_by, t.created_at, t.updated_at, t.deleted_at,
			u.id, u.first_name, u.last_name, u.email,
			c.id, c.first_name, c.last_name, c.email,
			col.name as column_name
		FROM tasks t
		LEFT JOIN users u ON t.assignee_id = u.id
		LEFT JOIN users c ON t.created_by = c.id
		LEFT JOIN board_columns col ON t.column_id = col.id
		WHERE (t.assignee_id = $1 OR t.created_by = $1) AND t.organization_id = $2 AND t.deleted_at IS NULL
		ORDER BY t.due_date ASC, t.created_at DESC
	`
	rows, err := h.repo.GetDB().QueryContext(r.Context(), query, userID, orgID)
	if err != nil {
		log.Printf("Error fetching user tasks: %v", err)
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch user tasks")
		return
	}
	defer rows.Close()

	response := make([]TaskResponse, 0)
	for rows.Next() {
		t := &domain.Task{}
		var uID, cID uuid.NullUUID
		var uFirstName, uLastName, uEmail, cFirstName, cLastName, cEmail sql.NullString
		var columnName sql.NullString

		err := rows.Scan(
			&t.ID, &t.OrganizationID, &t.BoardID, &t.ColumnID, &t.Title, &t.Description, &t.Priority, &t.AssigneeID, &t.DueDate, &t.Position, &t.CreatedBy, &t.CreatedAt, &t.UpdatedAt, &t.DeletedAt,
			&uID, &uFirstName, &uLastName, &uEmail,
			&cID, &cFirstName, &cLastName, &cEmail,
			&columnName,
		)
		if err != nil {
			log.Printf("Error scanning user task: %v", err)
			continue
		}

		taskResp := TaskResponse{
			ID:          t.ID.String(),
			BoardID:     t.BoardID.String(),
			ColumnID:    t.ColumnID.String(),
			ColumnName:  columnName.String,
			Title:       t.Title,
			Description: t.Description,
			Priority:    t.Priority,
			Position:    t.Position,
			CreatedBy:   t.CreatedBy.String(),
			CreatedAt:   t.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:   t.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}

		if uID.Valid {
			taskResp.Assignee = &UserResponse{
				ID:        uID.UUID.String(),
				Email:     uEmail.String,
				FirstName: uFirstName.String,
				LastName:  uLastName.String,
			}
			assigneeIDStr := uID.UUID.String()
			taskResp.AssigneeID = &assigneeIDStr
		}

		if cID.Valid {
			taskResp.Creator = &UserResponse{
				ID:        cID.UUID.String(),
				Email:     cEmail.String,
				FirstName: cFirstName.String,
				LastName:  cLastName.String,
			}
		}

		if t.DueDate != nil {
			dueDateStr := t.DueDate.Format("2006-01-02")
			taskResp.DueDate = &dueDateStr
		}

		response = append(response, taskResp)
	}

	RespondWithJSON(w, http.StatusOK, response)
}
