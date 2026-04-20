package handler

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type NotificationHandler struct {
	repo domain.NotificationRepository
}

func NewNotificationHandler(repo domain.NotificationRepository) *NotificationHandler {
	return &NotificationHandler{repo: repo}
}

func (h *NotificationHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	orgID, ok := GetOrgID(r.Context())
	if !ok {
		// If no org context, return empty list
		RespondWithJSON(w, http.StatusOK, []interface{}{})
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 50
	}

	notifications, err := h.repo.ListByUser(r.Context(), userID, orgID, limit)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch notifications")
		return
	}

	RespondWithJSON(w, http.StatusOK, notifications)
}

func (h *NotificationHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid ID")
		return
	}

	userID, _ := GetUserID(r.Context())
	orgID, _ := GetOrgID(r.Context())

	if err := h.repo.MarkAsRead(r.Context(), id, userID, orgID); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to mark as read")
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *NotificationHandler) MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	orgID, _ := GetOrgID(r.Context())

	if err := h.repo.MarkAllAsRead(r.Context(), userID, orgID); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to mark all as read")
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *NotificationHandler) GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	orgID, _ := GetOrgID(r.Context())
	count, err := h.repo.GetUnreadCount(r.Context(), userID, orgID)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to get unread count")
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]int{"count": count})
}

func (h *NotificationHandler) MarkByTypeAndRef(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	nType := r.URL.Query().Get("type")
	refIDStr := r.URL.Query().Get("refId")
	refID, err := uuid.Parse(refIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid reference ID")
		return
	}

	orgID, _ := GetOrgID(r.Context())
	if err := h.repo.MarkByTypeAndRef(r.Context(), userID, orgID, nType, refID); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to mark notifications as read")
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *NotificationHandler) GetUnreadCountsGroupByRef(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	nType := r.URL.Query().Get("type")
	if nType == "" {
		RespondWithError(w, http.StatusBadRequest, "Type is required")
		return
	}

	orgID, _ := GetOrgID(r.Context())
	counts, err := h.repo.GetUnreadCountsByRef(r.Context(), userID, orgID, nType)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to get unread counts")
		return
	}

	RespondWithJSON(w, http.StatusOK, counts)
}

func (h *NotificationHandler) MarkAllByType(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	nType := r.URL.Query().Get("type")
	if nType == "" {
		RespondWithError(w, http.StatusBadRequest, "Type is required")
		return
	}

	orgID, _ := GetOrgID(r.Context())
	if err := h.repo.MarkAllByType(r.Context(), userID, orgID, nType); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to mark notifications as read")
		return
	}

	w.WriteHeader(http.StatusOK)
}
