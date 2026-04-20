package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/hasret/company-os/backend/internal/adapter/search"
	"github.com/hasret/company-os/backend/internal/domain"
	"github.com/hasret/company-os/backend/internal/service"

	"github.com/google/uuid"
)

type AnnouncementHandler struct {
	repo          domain.AnnouncementRepository
	orgRepo       domain.OrganizationRepository
	notifyService *service.NotificationService
	indexer       *search.Indexer
}

func NewAnnouncementHandler(
	repo domain.AnnouncementRepository,
	orgRepo domain.OrganizationRepository,
	notifyService *service.NotificationService,
	indexer *search.Indexer,
) *AnnouncementHandler {
	return &AnnouncementHandler{
		repo:          repo,
		orgRepo:       orgRepo,
		notifyService: notifyService,
		indexer:       indexer,
	}
}

func (h *AnnouncementHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	orgID, _ := GetOrgID(ctx)
	userID, _ := GetUserID(ctx)

	var req struct {
		Title             string   `json:"title"`
		Content           string   `json:"content"`
		TargetType        string   `json:"target_type"`
		TargetDepartments []string `json:"target_departments"`
		TargetRoles       []string `json:"target_roles"`
		Priority          string   `json:"priority"`
		SendEmail         bool     `json:"send_email"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Geçersiz girdi")
		return
	}

	announcement := &domain.Announcement{
		ID:                uuid.New(),
		OrganizationID:    orgID,
		AuthorID:          userID,
		Title:             req.Title,
		Content:           req.Content,
		TargetType:        req.TargetType,
		TargetDepartments: req.TargetDepartments,
		TargetRoles:       req.TargetRoles,
		Priority:          req.Priority,
	}

	if err := h.repo.Create(ctx, announcement); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Trigger Notifications
	go func() {
		targetUsers, err := h.orgRepo.GetMembersByTarget(ctx, orgID, req.TargetDepartments, req.TargetRoles)
		if err != nil {
			log.Printf("Bildirim hedefleri alınamadı: %v", err)
			return
		}

		title := "Yeni Duyuru: " + req.Title
		message := fmt.Sprintf("'%s' başlıklı yeni bir duyuru yayınlandı:\n\n%s", req.Title, req.Content)
		for _, targetID := range targetUsers {
			h.notifyService.NotifyUser(ctx, targetID, orgID, "Yeni Duyuru", "Yayınlandı: "+req.Title, "announcement", &announcement.ID)

			if req.SendEmail {
				user, err := h.notifyService.GetUserRepo().GetByID(ctx, targetID)
				if err == nil && user != nil {
					h.notifyService.SendEmail(user.Email, title, message)
				}
			}
		}
	}()

	if h.indexer != nil {
		go h.indexer.IndexAnnouncement(context.Background(), announcement)
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(announcement)
}

func (h *AnnouncementHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	orgID, _ := GetOrgID(ctx)
	userDept, _ := GetUserDepartment(ctx)
	userRole, _ := GetUserRole(ctx)
	userID, _ := GetUserID(ctx)

	announcements, err := h.repo.GetByOrganization(ctx, orgID, userID, userDept, userRole)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	json.NewEncoder(w).Encode(announcements)
}
