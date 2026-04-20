package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type CalendarHandler struct {
	calendarSvc domain.CalendarService
}

func NewCalendarHandler(calendarSvc domain.CalendarService) *CalendarHandler {
	return &CalendarHandler{calendarSvc: calendarSvc}
}

func (h *CalendarHandler) GetEvents(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	
	// OrgID and UserID from context (Middleware ensure these exist)
	orgIDStr := r.Header.Get("X-Organization-ID")
	orgID, err := uuid.Parse(orgIDStr)
	if err != nil {
		http.Error(w, "Geçersiz Organizasyon ID", http.StatusBadRequest)
		return
	}

	userID, ok := ctx.Value(UserIDKey).(uuid.UUID)
	if !ok {
		http.Error(w, "Yetkisiz erişim", http.StatusUnauthorized)
		return
	}

	// Query params for date range (Optional for now, defaults to month)
	now := time.Now()
	start := now.AddDate(0, -1, 0) // Default 1 month back
	end := now.AddDate(0, 1, 0)   // Default 1 month forward

	events, err := h.calendarSvc.GetEvents(ctx, orgID, userID, start, end)
	if err != nil {
		http.Error(w, "Etkinlikler getirilemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}
