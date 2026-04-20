package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type ChatRoomType string

const (
	ChatRoomTypeChannel ChatRoomType = "channel"
	ChatRoomTypeDirect  ChatRoomType = "direct"
)

type MessageStatus string

const (
	MessageStatusSent      MessageStatus = "sent"      // 1 gray check
	MessageStatusDelivered MessageStatus = "delivered" // 2 gray checks
	MessageStatusRead      MessageStatus = "read"      // 2 blue checks
)

type ChatRoom struct {
	ID             uuid.UUID    `json:"id"`
	OrganizationID uuid.UUID    `json:"organization_id"`
	Name           string       `json:"name"`
	Type           ChatRoomType `json:"type"`
	CreatedAt      time.Time    `json:"created_at"`
	Members        []User       `json:"members,omitempty"`
	LastMessage    *ChatMessage `json:"last_message,omitempty"`
}

type ChatMessage struct {
	ID         uuid.UUID `json:"id"`
	ChatRoomID uuid.UUID `json:"chat_room_id"`
	SenderID   uuid.UUID `json:"sender_id"`
	Sender     *User     `json:"sender,omitempty"`
	Content    string    `json:"content"`
	FileName   *string   `json:"file_name,omitempty"`
	FileType   *string   `json:"file_type,omitempty"`
	FileSize   *int64    `json:"file_size,omitempty"`
	FileUrl    *string       `json:"file_url,omitempty"`
	Status     MessageStatus `json:"status"`
	CreatedAt  time.Time     `json:"created_at"`
}

type ChatRepository interface {
	CreateRoom(ctx context.Context, room *ChatRoom) error
	GetRoom(ctx context.Context, id uuid.UUID) (*ChatRoom, error)
	ListRoomsByOrganization(ctx context.Context, orgID uuid.UUID, userID uuid.UUID) ([]*ChatRoom, error)
	AddRoomMember(ctx context.Context, roomID, userID uuid.UUID) error
	GetRoomMembers(ctx context.Context, roomID uuid.UUID) ([]User, error)

	UpdateMessageStatus(ctx context.Context, id uuid.UUID, status MessageStatus) error
	SaveMessage(ctx context.Context, msg *ChatMessage) error
	GetMessagesByRoom(ctx context.Context, roomID uuid.UUID, userID uuid.UUID, limit int) ([]*ChatMessage, error)
	DeleteMessage(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	DeleteMessageForMe(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	DeleteRoom(ctx context.Context, id uuid.UUID, orgID uuid.UUID) error
	UpdateRoom(ctx context.Context, id uuid.UUID, name string) error
}
