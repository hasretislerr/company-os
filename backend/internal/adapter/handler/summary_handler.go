package handler

import (
	"net/http"
	"time"

	"database/sql"
)

type SummaryHandler struct {
	db *sql.DB
}

func NewSummaryHandler(db *sql.DB) *SummaryHandler {
	return &SummaryHandler{db: db}
}

type SidebarCounts struct {
	Tasks         int `json:"tasks"`
	Announcements int `json:"announcements"`
	Chat          int `json:"chat"`
	LeaveRequests int `json:"leave_requests"`
	Meetings      int `json:"meetings"`
}

func (h *SummaryHandler) GetSidebarCounts(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	orgID, ok := GetOrgID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusBadRequest, "Organization not selected")
		return
	}

	counts := SidebarCounts{}

	// 1. Task notification count (unread task-type notifications for this user)
	err := h.db.QueryRowContext(r.Context(), `
		SELECT COUNT(*) FROM notifications 
		WHERE user_id = $1 AND organization_id = $2 AND type = 'task' AND is_read = FALSE
	`, userID, orgID).Scan(&counts.Tasks)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to count tasks")
		return
	}

	// 2. Unread Announcements (This is tricky since we don't have per-user read state yet)
	// For now, let's just count announcements in the last 7 days or use the notifications table.
	// Actually, the user asked for sidebar category counts based on unread notifications.
	err = h.db.QueryRowContext(r.Context(), `
		SELECT COUNT(*) FROM notifications 
		WHERE user_id = $1 AND organization_id = $2 AND is_read = FALSE AND type = 'announcement'
	`, userID, orgID).Scan(&counts.Announcements)
	if err != nil {
		counts.Announcements = 0
	}

	// 3. Incoming Leave Requests (if manager/admin)
	err = h.db.QueryRowContext(r.Context(), `
		SELECT COUNT(*) FROM leave_requests 
		WHERE organization_id = $1 AND status = 'pending'
	`, orgID).Scan(&counts.LeaveRequests)
	if err != nil {
		counts.LeaveRequests = 0
	}

	// 4. Upcoming Meetings (today onwards)
	err = h.db.QueryRowContext(r.Context(), `
		SELECT COUNT(*) FROM meetings 
		WHERE organization_id = $1 AND start_time >= $2 AND status != 'cancelled'
	`, orgID, time.Now().Truncate(24*time.Hour)).Scan(&counts.Meetings)
	if err != nil {
		counts.Meetings = 0
	}

	// 5. Chat (unread messages - simplified)
	err = h.db.QueryRowContext(r.Context(), `
		SELECT COUNT(*) FROM notifications 
		WHERE user_id = $1 AND organization_id = $2 AND is_read = FALSE AND type = 'chat'
	`, userID, orgID).Scan(&counts.Chat)
	if err != nil {
		counts.Chat = 0
	}

	RespondWithJSON(w, http.StatusOK, counts)
}
