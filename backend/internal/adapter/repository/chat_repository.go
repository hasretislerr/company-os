package repository

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/domain"
)

type PostgresChatRepository struct {
	db *sql.DB
}

func NewPostgresChatRepository(db *sql.DB) *PostgresChatRepository {
	return &PostgresChatRepository{db: db}
}

func (r *PostgresChatRepository) CreateRoom(ctx context.Context, room *domain.ChatRoom) error {
	query := `
		INSERT INTO chat_rooms (id, organization_id, name, type, created_at)
		VALUES ($1, $2, $3, $4, NOW())
	`
	_, err := r.db.ExecContext(ctx, query, room.ID, room.OrganizationID, room.Name, room.Type)
	return err
}

func (r *PostgresChatRepository) GetRoom(ctx context.Context, id uuid.UUID) (*domain.ChatRoom, error) {
	query := `SELECT id, organization_id, name, type, created_at FROM chat_rooms WHERE id = $1`
	room := &domain.ChatRoom{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(&room.ID, &room.OrganizationID, &room.Name, &room.Type, &room.CreatedAt)
	if err != nil {
		return nil, err
	}
	return room, nil
}

func (r *PostgresChatRepository) ListRoomsByOrganization(ctx context.Context, orgID uuid.UUID, userID uuid.UUID) ([]*domain.ChatRoom, error) {
	// List rooms where the user is a member, OR public channels in the organization
	query := `
		SELECT DISTINCT r.id, r.organization_id, r.name, r.type, r.created_at
		FROM chat_rooms r
		LEFT JOIN chat_room_members m ON r.id = m.chat_room_id
		WHERE r.organization_id = $1 AND (r.type = 'channel' OR m.user_id = $2)
		ORDER BY r.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, orgID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rooms := []*domain.ChatRoom{}

	for rows.Next() {
		room := &domain.ChatRoom{}
		if err := rows.Scan(&room.ID, &room.OrganizationID, &room.Name, &room.Type, &room.CreatedAt); err != nil {
			return nil, err
		}
		rooms = append(rooms, room)
	}

	// Fetch members and last message for each room
	for _, room := range rooms {
		// Fetch members
		members, err := r.GetRoomMembers(ctx, room.ID)
		if err == nil {
			room.Members = members
		}

		// Fetch last message
		queryMsg := `
			SELECT m.id, m.content, m.sender_id, m.created_at, 
			       COALESCE(u.first_name, ''), COALESCE(u.last_name, ''), COALESCE(u.email, ''), COALESCE(u.avatar_url, '')
			FROM chat_messages m
			JOIN users u ON m.sender_id = u.id
			WHERE m.chat_room_id = $1
			ORDER BY m.created_at DESC
			LIMIT 1
		`
		msg := &domain.ChatMessage{Sender: &domain.User{}}
		err = r.db.QueryRowContext(ctx, queryMsg, room.ID).Scan(
			&msg.ID, &msg.Content, &msg.SenderID, &msg.CreatedAt,
			&msg.Sender.FirstName, &msg.Sender.LastName, &msg.Sender.Email, &msg.Sender.AvatarURL,
		)
		if err == nil {
			room.LastMessage = msg
		}
	}

	return rooms, nil
}

func (r *PostgresChatRepository) AddRoomMember(ctx context.Context, roomID, userID uuid.UUID) error {
	query := `INSERT INTO chat_room_members (chat_room_id, user_id, joined_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`
	_, err := r.db.ExecContext(ctx, query, roomID, userID)
	return err
}

func (r *PostgresChatRepository) SaveMessage(ctx context.Context, msg *domain.ChatMessage) error {
	if msg.Status == "" {
		msg.Status = domain.MessageStatusSent
	}
	query := `
		INSERT INTO chat_messages (id, chat_room_id, sender_id, content, file_name, file_type, file_size, file_url, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.db.ExecContext(ctx, query, msg.ID, msg.ChatRoomID, msg.SenderID, msg.Content, msg.FileName, msg.FileType, msg.FileSize, msg.FileUrl, msg.Status, msg.CreatedAt)
	return err
}

func (r *PostgresChatRepository) GetMessagesByRoom(ctx context.Context, roomID uuid.UUID, userID uuid.UUID, limit int) ([]*domain.ChatMessage, error) {
	query := `
		SELECT m.id, m.chat_room_id, m.sender_id, m.content, m.file_name, m.file_type, m.file_size, m.file_url, m.status, m.created_at,
		       u.first_name, u.last_name, u.email
		FROM chat_messages m
		JOIN users u ON m.sender_id = u.id
		LEFT JOIN chat_message_deletions d ON m.id = d.message_id AND d.user_id = $3
		WHERE m.chat_room_id = $1 AND d.message_id IS NULL
		ORDER BY m.created_at DESC
		LIMIT $2
	`
	rows, err := r.db.QueryContext(ctx, query, roomID, limit, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	messages := []*domain.ChatMessage{}

	for rows.Next() {
		msg := &domain.ChatMessage{Sender: &domain.User{}}
		err := rows.Scan(
			&msg.ID, &msg.ChatRoomID, &msg.SenderID, &msg.Content, &msg.FileName, &msg.FileType, &msg.FileSize, &msg.FileUrl, &msg.Status, &msg.CreatedAt,
			&msg.Sender.FirstName, &msg.Sender.LastName, &msg.Sender.Email,
		)
		if err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}

	// Reverse messages to be chronological
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}
func (r *PostgresChatRepository) GetRoomMembers(ctx context.Context, roomID uuid.UUID) ([]domain.User, error) {
	query := `
		SELECT u.id, COALESCE(u.email, ''), COALESCE(u.first_name, ''), COALESCE(u.last_name, ''), COALESCE(u.avatar_url, '')
		FROM users u
		JOIN chat_room_members m ON u.id = m.user_id
		WHERE m.chat_room_id = $1
	`
	rows, err := r.db.QueryContext(ctx, query, roomID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []domain.User
	for rows.Next() {
		var u domain.User
		if err := rows.Scan(&u.ID, &u.Email, &u.FirstName, &u.LastName, &u.AvatarURL); err != nil {
			return nil, err
		}
		members = append(members, u)
	}
	return members, nil
}
func (r *PostgresChatRepository) DeleteMessage(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	query := `DELETE FROM chat_messages WHERE id = $1 AND sender_id = $2`
	res, err := r.db.ExecContext(ctx, query, id, userID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *PostgresChatRepository) DeleteMessageForMe(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	query := `INSERT INTO chat_message_deletions (user_id, message_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`
	_, err := r.db.ExecContext(ctx, query, userID, id)
	return err
}

func (r *PostgresChatRepository) DeleteRoom(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error {
	query := `DELETE FROM chat_rooms WHERE id = $1 AND organization_id = $2`
	res, err := r.db.ExecContext(ctx, query, id, orgID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *PostgresChatRepository) UpdateMessageStatus(ctx context.Context, id uuid.UUID, status domain.MessageStatus) error {
	query := `UPDATE chat_messages SET status = $1 WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, status, id)
	return err
}

func (r *PostgresChatRepository) UpdateRoom(ctx context.Context, id uuid.UUID, name string) error {
	query := `UPDATE chat_rooms SET name = $1 WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, name, id)
	return err
}
