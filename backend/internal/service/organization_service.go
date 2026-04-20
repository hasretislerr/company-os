package service

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type OrganizationService struct {
	orgRepo domain.OrganizationRepository
}

func NewOrganizationService(orgRepo domain.OrganizationRepository) *OrganizationService {
	return &OrganizationService{orgRepo: orgRepo}
}

// GenerateSlug creates a URL-friendly slug from organization name
func (s *OrganizationService) GenerateSlug(name string) string {
	// Convert to lowercase
	slug := strings.ToLower(name)

	// Replace spaces and special characters with hyphens
	reg := regexp.MustCompile("[^a-z0-9]+")
	slug = reg.ReplaceAllString(slug, "-")

	// Remove leading/trailing hyphens
	slug = strings.Trim(slug, "-")

	return slug
}

// CreateOrganization creates a new organization and adds the creator as admin
func (s *OrganizationService) CreateOrganization(ctx context.Context, name string, creatorID uuid.UUID) (*domain.Organization, error) {
	org := &domain.Organization{
		ID:        uuid.New(),
		Name:      name,
		Slug:      s.GenerateSlug(name),
		PlanType:  "free",
		CreatedBy: creatorID,
	}

	if err := s.orgRepo.Create(ctx, org); err != nil {
		return nil, fmt.Errorf("failed to create organization: %w", err)
	}

	// Add creator as member
	member := &domain.OrganizationMember{
		ID:             uuid.New(),
		OrganizationID: org.ID,
		UserID:         creatorID,
		Role:           "admin", // Creator is always admin
	}

	if err := s.orgRepo.AddMember(ctx, member); err != nil {
		return nil, fmt.Errorf("failed to add creator as member: %w", err)
	}

	return org, nil
}
