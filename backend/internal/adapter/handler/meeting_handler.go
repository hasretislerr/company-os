package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/adapter/repository"
	"github.com/hasret/company-os/backend/internal/domain"
)

type MeetingHandler struct {
	repo *repository.PostgresMeetingRepository
}

func NewMeetingHandler(repo *repository.PostgresMeetingRepository) *MeetingHandler {
	return &MeetingHandler{repo: repo}
}

func (h *MeetingHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	orgID, _ := GetOrgID(ctx)
	userID, _ := GetUserID(ctx)

	var req struct {
		Title       string      `json:"title"`
		Description string      `json:"description"`
		StartTime   time.Time   `json:"start_time"`
		EndTime     *time.Time  `json:"end_time"`
		MemberIDs   []uuid.UUID `json:"member_ids"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid input")
		return
	}

	meeting := &domain.Meeting{
		ID:             uuid.New(),
		OrganizationID: orgID,
		CreatorID:      userID,
		Title:          req.Title,
		Description:    req.Description,
		StartTime:      req.StartTime,
		EndTime:        req.EndTime,
	}

	if err := h.repo.Create(ctx, meeting); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Add creator as accepted
	h.repo.AddParticipant(ctx, meeting.ID, userID)
	h.repo.UpdateParticipantStatus(ctx, meeting.ID, userID, "accepted")

	// Add others
	for _, mID := range req.MemberIDs {
		h.repo.AddParticipant(ctx, meeting.ID, mID)
	}

	w.WriteHeader(http.StatusCreated)
	RespondWithJSON(w, http.StatusCreated, meeting)
}

func (h *MeetingHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	orgID, _ := GetOrgID(ctx)

	meetings, err := h.repo.ListByOrganization(ctx, orgID)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	RespondWithJSON(w, http.StatusOK, meetings)
}

func (h *MeetingHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid ID")
		return
	}

	meeting, err := h.repo.GetByID(ctx, id)
	if err != nil {
		RespondWithError(w, http.StatusNotFound, err.Error())
		return
	}

	RespondWithJSON(w, http.StatusOK, meeting)
}

func (h *MeetingHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid ID")
		return
	}

	orgID, _ := GetOrgID(ctx)
	if err := h.repo.Delete(ctx, id, orgID); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *MeetingHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	idStr := chi.URLParam(r, "id")
	meetingID, _ := uuid.Parse(idStr)
	userID, _ := GetUserID(ctx)

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid input")
		return
	}

	if err := h.repo.UpdateParticipantStatus(ctx, meetingID, userID, req.Status); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
}
