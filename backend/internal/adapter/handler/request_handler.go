package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
	"github.com/hasret/company-os/backend/internal/service"
)

type RequestHandler struct {
	requestService *service.RequestService
	requestRepo    domain.RequestRepository
	userRepo       domain.UserRepository
	orgRepo        domain.OrganizationRepository
}

func NewRequestHandler(requestService *service.RequestService, requestRepo domain.RequestRepository, userRepo domain.UserRepository, orgRepo domain.OrganizationRepository) *RequestHandler {
	return &RequestHandler{
		requestService: requestService,
		requestRepo:    requestRepo,
		userRepo:       userRepo,
		orgRepo:        orgRepo,
	}
}

type CreateRequestRequest struct {
	Department  string `json:"department"`
	RoleName    string `json:"role_name"`
	ProblemType string `json:"problem_type"`
	Description string `json:"description"`
}

func (h *RequestHandler) CreateRequest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID, ok := GetUserID(ctx)
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var reqBody CreateRequestRequest
	if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// If orgID isn't provided directly, derive it from user's primary connection
	orgIDStr := r.Header.Get("X-Organization-ID")
	var orgID uuid.UUID
	if orgIDStr != "" {
		orgID, _ = uuid.Parse(orgIDStr)
	}

	if orgID == uuid.Nil {
		orgs, err := h.orgRepo.GetUserOrganizations(ctx, userID)
		if err == nil && len(orgs) > 0 {
			orgID = orgs[0].ID
		}
	}

	req := &domain.Request{
		OrganizationID: orgID,
		CreatorID:      userID,
		Department:     reqBody.Department,
		RoleName:       reqBody.RoleName,
		ProblemType:    reqBody.ProblemType,
		Description:    reqBody.Description,
	}

	if err := h.requestService.CreateRequest(ctx, req); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(req)
}

func (h *RequestHandler) GetRequests(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID, ok := GetUserID(ctx)
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	user, err := h.userRepo.GetByID(ctx, userID)
	if err != nil {
		RespondWithError(w, http.StatusNotFound, "User not found")
		return
	}

	orgIDStr := r.Header.Get("X-Organization-ID")
	var orgID uuid.UUID
	if orgIDStr != "" {
		orgID, _ = uuid.Parse(orgIDStr)
	}

	if orgID == uuid.Nil {
		orgs, err := h.orgRepo.GetUserOrganizations(ctx, userID)
		if err == nil && len(orgs) > 0 {
			orgID = orgs[0].ID
		}
	}

	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")
	limit := 50
	offset := 0
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil {
			offset = o
		}
	}

	isAdmin := strings.Contains(strings.ToLower(user.Role), "admin")
	isManager := strings.Contains(strings.ToLower(user.Role), "manager") || isAdmin

	requests, err := h.requestRepo.ListRelevant(ctx, orgID, user.ID, isManager, isAdmin, user.Department, limit, offset)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	RespondWithJSON(w, http.StatusOK, requests)
}

type UpdateRequestStatusBody struct {
	Status string `json:"status"`
}

func (h *RequestHandler) UpdateRequestStatus(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid ID")
		return
	}

	var reqBody UpdateRequestStatusBody
	if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid body")
		return
	}

	status := domain.RequestStatus(reqBody.Status)
	if status != domain.RequestStatusOpen && status != domain.RequestStatusClosed {
		RespondWithError(w, http.StatusBadRequest, "Invalid status")
		return
	}

	err = h.requestRepo.UpdateStatus(r.Context(), id, status)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
}
