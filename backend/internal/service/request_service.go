package service

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type RequestService struct {
	repo      domain.RequestRepository
	userRepo  domain.UserRepository
	notifRepo domain.NotificationRepository
}

func NewRequestService(repo domain.RequestRepository, userRepo domain.UserRepository, notifRepo domain.NotificationRepository) *RequestService {
	return &RequestService{
		repo:      repo,
		userRepo:  userRepo,
		notifRepo: notifRepo,
	}
}

func (s *RequestService) CreateRequest(ctx context.Context, req *domain.Request) error {
	req.ID = uuid.New()
	req.Status = domain.RequestStatusOpen
	req.CreatedAt = time.Now()
	req.UpdatedAt = time.Now()

	err := s.repo.Create(ctx, req)
	if err != nil {
		return err
	}

	go s.notifyDepartmentManager(context.Background(), req)

	return nil
}

func (s *RequestService) notifyDepartmentManager(ctx context.Context, req *domain.Request) {
	users, err := s.userRepo.ListAll(ctx, req.OrganizationID)
	if err != nil {
		log.Printf("Failed to list users for organization %s: %v\n", req.OrganizationID, err)
		return
	}

	var manager *domain.User
	var fallbackUser *domain.User

	for _, u := range users {
		if u.Department == req.Department || u.Department == strings.ToLower(req.Department) {
			if strings.Contains(strings.ToLower(u.Role), "manager") || strings.Contains(strings.ToLower(u.Role), "admin") {
				manager = u
				break
			}
			fallbackUser = u
		}
	}

	targetUser := manager
	if targetUser == nil {
		targetUser = fallbackUser
	}

	if targetUser == nil {
		log.Printf("No user found in department %s for request %s\n", req.Department, req.ID)
		return
	}

	notif := &domain.Notification{
		ID:             uuid.New(),
		OrganizationID: req.OrganizationID,
		UserID:         targetUser.ID,
		Title:          "Yeni Talep: " + req.ProblemType,
		Message:        fmt.Sprintf("Yeni bir %s talebi oluşturuldu. İncelemek için tıklayın.", req.ProblemType),
		Type:           "request",
		ReferenceID:    &req.ID,
		IsRead:         false,
		CreatedAt:      time.Now(),
	}

	err = s.notifRepo.Create(ctx, notif)
	if err != nil {
		log.Printf("Failed to create notification for request %s: %v\n", req.ID, err)
	}
}

func (s *RequestService) ProcessEscalations(ctx context.Context) {
	olderThan := time.Now().Add(-10 * time.Minute)
	requests, err := s.repo.GetUnescalated(ctx, olderThan)
	if err != nil {
		log.Printf("ProcessEscalations: failed to get unescalated requests: %v\n", err)
		return
	}

	for _, req := range requests {
		users, err := s.userRepo.ListAll(ctx, req.OrganizationID)
		if err != nil {
			log.Printf("ProcessEscalations: failed to get users for org %s: %v\n", req.OrganizationID, err)
			continue
		}

		var notifiedCount int
		for _, u := range users {
			if (strings.EqualFold(u.Department, req.Department)) && u.ID != req.CreatorID {
				notif := &domain.Notification{
					ID:             uuid.New(),
					OrganizationID: req.OrganizationID,
					UserID:         u.ID,
					Title:          "Talep Gecikmesi: " + req.ProblemType,
					Message:        fmt.Sprintf("Bu %s talebi 10 dakikadır açık. İncelemek için tıklayın.", req.ProblemType),
					Type:           "request",
					ReferenceID:    &req.ID,
					IsRead:         false,
					CreatedAt:      time.Now(),
				}
				s.notifRepo.Create(ctx, notif)
				notifiedCount++
			}
		}

		s.repo.MarkEscalated(ctx, req.ID)
		log.Printf("Escalated request %s to %d users in department %s\n", req.ID, notifiedCount, req.Department)
	}
}
