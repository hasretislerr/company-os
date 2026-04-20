package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
	"github.com/hasret/company-os/backend/internal/service"
)

type AttendanceHandler struct {
	service *service.AttendanceService
}

func NewAttendanceHandler(service *service.AttendanceService) *AttendanceHandler {
	return &AttendanceHandler{service: service}
}

func (h *AttendanceHandler) CheckIn(w http.ResponseWriter, r *http.Request) {
	userID, _ := GetUserID(r.Context())
	orgID, _ := GetOrgID(r.Context())

	// Biometric check-in (simulated via API for now)
	if err := h.service.CheckIn(r.Context(), userID, orgID, domain.AttendanceSourceBiometric); err != nil {
		RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Giriş yapıldı"})
}

func (h *AttendanceHandler) CheckOut(w http.ResponseWriter, r *http.Request) {
	userID, _ := GetUserID(r.Context())
	orgID, _ := GetOrgID(r.Context())

	if err := h.service.CheckOut(r.Context(), userID, orgID); err != nil {
		RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Çıkış yapıldı"})
}

func (h *AttendanceHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID, _ := GetOrgID(r.Context())
	dateStr := r.URL.Query().Get("date")

	date := time.Now()
	if dateStr != "" {
		if d, err := time.Parse("2006-01-02", dateStr); err == nil {
			date = d
		}
	}

	results, err := h.service.ListDailyAttendance(r.Context(), orgID, date)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Veriler getirilemedi")
		return
	}

	RespondWithJSON(w, http.StatusOK, results)
}

func (h *AttendanceHandler) Update(w http.ResponseWriter, r *http.Request) {
	managerID, _ := GetUserID(r.Context())
	attIDStr := chi.URLParam(r, "id")
	attID, err := uuid.Parse(attIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Geçersiz ID")
		return
	}

	// Check if user is manager or admin
	userRole, ok := GetUserRole(r.Context())
	if !ok || (userRole != "manager" && userRole != "admin") {
		RespondWithError(w, http.StatusForbidden, "Bu işlem için yetkiniz yok (Yönetici yetkisi gerekli)")
		return
	}

	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Geçersiz istek")
		return
	}

	orgID, _ := GetOrgID(r.Context())
	if err := h.service.UpdateAttendanceManual(r.Context(), managerID, orgID, attID, req); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Kayıt güncellendi"})
}

func (h *AttendanceHandler) GetLogs(w http.ResponseWriter, r *http.Request) {
	attIDStr := chi.URLParam(r, "id")
	attID, err := uuid.Parse(attIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Geçersiz ID")
		return
	}

	orgID, _ := GetOrgID(r.Context())
	logs, err := h.service.GetAuditLogs(r.Context(), attID, orgID)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Loglar getirilemedi")
		return
	}

	RespondWithJSON(w, http.StatusOK, logs)
}
