package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
	"github.com/hasret/company-os/backend/internal/service"
)

type LeaveRequestHandler struct {
	service *service.LeaveRequestService
}

func NewLeaveRequestHandler(service *service.LeaveRequestService) *LeaveRequestHandler {
	return &LeaveRequestHandler{service: service}
}

type CreateLeaveRequestInput struct {
	Type      string `json:"type"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	Reason    string `json:"reason"`
}

func (h *LeaveRequestHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID, ok := GetUserID(ctx)
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	orgID, ok := GetOrgID(ctx)
	if !ok {
		RespondWithError(w, http.StatusBadRequest, "Organization context required")
		return
	}

	var input CreateLeaveRequestInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		log.Printf("Error decoding leave request input: %v", err)
		RespondWithError(w, http.StatusBadRequest, "Invalid input")
		return
	}
	log.Printf("Received leave request: %+v", input)

	// Parse dates (expected format: YYYY-MM-DD)
	startDate, err := time.Parse("2006-01-02", input.StartDate)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid start_date format. Use YYYY-MM-DD")
		return
	}

	endDate, err := time.Parse("2006-01-02", input.EndDate)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid end_date format. Use YYYY-MM-DD")
		return
	}

	req, err := h.service.CreateLeaveRequest(ctx, userID, orgID, input.Type, startDate, endDate, input.Reason)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(req)
}

func (h *LeaveRequestHandler) ListMyRequests(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID, ok := GetUserID(ctx)
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	orgID, _ := GetOrgID(ctx)

	requests, err := h.service.ListByUser(ctx, userID, orgID)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch requests")
		return
	}

	json.NewEncoder(w).Encode(requests)
}

// ListIncomingRequests returns pending requests based on user role
func (h *LeaveRequestHandler) ListIncomingRequests(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	orgID, ok := GetOrgID(ctx)
	if !ok {
		RespondWithError(w, http.StatusBadRequest, "Organization context required")
		return
	}

	// Get user role and department from context
	role, ok := GetUserRole(ctx)
	if !ok {
		role = "member"
	}
	department, _ := GetUserDepartment(ctx)

	var requests []*domain.LeaveRequest
	var err error

	// Filter based on role
	if role == "manager" {
		requests, err = h.service.ListPendingForManager(ctx, orgID, department)
	} else if role == "hr" || role == "admin" {
		requests, err = h.service.ListPendingForHR(ctx, orgID)
	} else {

		// Regular members don't see incoming requests
		requests = []*domain.LeaveRequest{}
	}

	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch requests")
		return
	}

	json.NewEncoder(w).Encode(requests)
}

type UpdateLeaveRequestStatusInput struct {
	Status          domain.LeaveRequestStatus `json:"status"`
	RejectionReason string                    `json:"rejection_reason"`
}

// UpdateStatus updates approval status based on user role
func (h *LeaveRequestHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid ID")
		return
	}

	var input UpdateLeaveRequestStatusInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid input")
		return
	}

	ctx := r.Context()
	userID, ok := GetUserID(ctx)
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	role, ok := GetUserRole(ctx)
	if !ok {
		role = "member"
	}

	orgID, _ := GetOrgID(ctx)

	// Update based on role
	if role == "manager" {
		err = h.service.UpdateManagerStatus(ctx, id, orgID, input.Status, userID, input.RejectionReason)
	} else if role == "hr" || role == "admin" {
		err = h.service.UpdateHRStatus(ctx, id, orgID, input.Status, userID, input.RejectionReason)
	} else {
		RespondWithError(w, http.StatusForbidden, "Unauthorized: insufficient permissions")
		return
	}

	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to update status")
		return
	}

	w.WriteHeader(http.StatusOK)
}
