package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type calendarService struct {
	taskRepo    domain.TaskRepository
	meetingRepo domain.MeetingRepository
	leaveRepo   domain.LeaveRequestRepository
}

func NewCalendarService(
	taskRepo domain.TaskRepository,
	meetingRepo domain.MeetingRepository,
	leaveRepo domain.LeaveRequestRepository,
) domain.CalendarService {
	return &calendarService{
		taskRepo:    taskRepo,
		meetingRepo: meetingRepo,
		leaveRepo:   leaveRepo,
	}
}

func (s *calendarService) GetEvents(ctx context.Context, orgID, userID uuid.UUID, start, end time.Time) ([]*domain.CalendarEvent, error) {
	var events []*domain.CalendarEvent

	// 1. Get Meetings
	meetings, err := s.meetingRepo.ListByOrganization(ctx, orgID)
	if err == nil {
		for _, m := range meetings {
			// Sadece kullanıcının katıldığı veya başlattığı toplantıları ekle (Opsiyonel: tüm org toplantıları da olabilir)
			// Burada basitlik için org bazlı tüm toplantıları ekliyoruz, ilerde katılımcı filtresi eklenebilir.
			events = append(events, &domain.CalendarEvent{
				ID:          "meeting-" + m.ID.String(),
				Title:       "[TOPLANTI] " + m.Title,
				Description: m.Description,
				Type:        domain.EventTypeMeeting,
				StartDate:   m.StartTime,
				EndDate:     m.EndTime,
				Status:      "scheduled",
				Color:       "#4F46E5", // Indigo
				RefID:       m.ID,
			})
		}
	}

	// 2. Get Leaves
	leaves, err := s.leaveRepo.ListByUser(ctx, userID, orgID)
	if err == nil {
		for _, l := range leaves {
			// Sadece onaylanmış veya bekleyen izinleri göster
			events = append(events, &domain.CalendarEvent{
				ID:          "leave-" + l.ID.String(),
				Title:       "[İZİN] " + l.Type,
				Description: l.Reason,
				Type:        domain.EventTypeLeave,
				StartDate:   l.StartDate,
				EndDate:     &l.EndDate,
				Status:      string(l.Status),
				Color:       "#10B981", // Emerald
				RefID:       l.ID,
			})
		}
	}

	// 3. Get Tasks
	tasks, err := s.taskRepo.ListByUser(ctx, userID, orgID)
	if err == nil {
		for _, t := range tasks {
			if t.DueDate != nil {
				// Görevleri teslim tarihlerine (Due Date) göre takvime ekle
				events = append(events, &domain.CalendarEvent{
					ID:          "task-" + t.ID.String(),
					Title:       "[GÖREV] " + t.Title,
					Description: t.Description,
					Type:        domain.EventTypeTask,
					StartDate:   *t.DueDate,
					EndDate:     nil, // Görevler genelde anlık (deadline)
					Status:      "active",
					Color:       "#F59E0B", // Amber
					RefID:       t.ID,
				})
			}
		}
	}

	return events, nil
}
