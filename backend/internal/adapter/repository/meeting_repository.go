package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type PostgresMeetingRepository struct {
	db *sql.DB
}

func NewPostgresMeetingRepository(db *sql.DB) *PostgresMeetingRepository {
	return &PostgresMeetingRepository{db: db}
}

func (r *PostgresMeetingRepository) Create(ctx context.Context, meeting *domain.Meeting) error {
	query := `
		INSERT INTO meetings (id, organization_id, creator_id, title, description, start_time, end_time, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
	`
	_, err := r.db.ExecContext(ctx, query,
		meeting.ID, meeting.OrganizationID, meeting.CreatorID,
		meeting.Title, meeting.Description, meeting.StartTime,
		meeting.EndTime,
	)
	return err
}

func (r *PostgresMeetingRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Meeting, error) {
	query := `
		SELECT id, organization_id, creator_id, title, description, start_time, end_time, created_at, updated_at
		FROM meetings
		WHERE id = $1
	`
	meeting := &domain.Meeting{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&meeting.ID, &meeting.OrganizationID, &meeting.CreatorID,
		&meeting.Title, &meeting.Description, &meeting.StartTime,
		&meeting.EndTime, &meeting.CreatedAt, &meeting.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Fetch participants
	participants, err := r.getParticipants(ctx, id)
	if err == nil {
		meeting.Participants = participants
	}

	return meeting, nil
}

func (r *PostgresMeetingRepository) ListByOrganization(ctx context.Context, orgID uuid.UUID) ([]*domain.Meeting, error) {
	query := `
		SELECT id, organization_id, creator_id, title, description, start_time, end_time, created_at, updated_at
		FROM meetings
		WHERE organization_id = $1
		ORDER BY start_time ASC
	`
	rows, err := r.db.QueryContext(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var meetings []*domain.Meeting
	for rows.Next() {
		m := &domain.Meeting{}
		err := rows.Scan(
			&m.ID, &m.OrganizationID, &m.CreatorID,
			&m.Title, &m.Description, &m.StartTime,
			&m.EndTime, &m.CreatedAt, &m.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		meetings = append(meetings, m)
	}

	// For a small list, we can fetch participants in a loop or optimize later
	for i := range meetings {
		parts, _ := r.getParticipants(ctx, meetings[i].ID)
		meetings[i].Participants = parts
	}

	return meetings, nil
}

func (r *PostgresMeetingRepository) Delete(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error {
	query := `DELETE FROM meetings WHERE id = $1 AND organization_id = $2`
	res, err := r.db.ExecContext(ctx, query, id, orgID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("meeting not found")
	}
	return nil
}

func (r *PostgresMeetingRepository) AddParticipant(ctx context.Context, meetingID, userID uuid.UUID) error {
	query := `
		INSERT INTO meeting_participants (meeting_id, user_id, status, joined_at)
		VALUES ($1, $2, 'invited', NOW())
		ON CONFLICT (meeting_id, user_id) DO NOTHING
	`
	_, err := r.db.ExecContext(ctx, query, meetingID, userID)
	return err
}

func (r *PostgresMeetingRepository) UpdateParticipantStatus(ctx context.Context, meetingID, userID uuid.UUID, status string) error {
	query := `UPDATE meeting_participants SET status = $1 WHERE meeting_id = $2 AND user_id = $3`
	_, err := r.db.ExecContext(ctx, query, status, meetingID, userID)
	return err
}

func (r *PostgresMeetingRepository) getParticipants(ctx context.Context, meetingID uuid.UUID) ([]domain.MeetingParticipant, error) {
	query := `
		SELECT mp.meeting_id, mp.user_id, mp.status, mp.joined_at,
		       u.first_name, u.last_name, u.email
		FROM meeting_participants mp
		JOIN users u ON mp.user_id = u.id
		WHERE mp.meeting_id = $1
	`
	rows, err := r.db.QueryContext(ctx, query, meetingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var participants []domain.MeetingParticipant
	for rows.Next() {
		p := domain.MeetingParticipant{User: &domain.User{}}
		err := rows.Scan(
			&p.MeetingID, &p.UserID, &p.Status, &p.JoinedAt,
			&p.User.FirstName, &p.User.LastName, &p.User.Email,
		)
		if err != nil {
			return nil, err
		}
		participants = append(participants, p)
	}
	return participants, nil
}
