package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/hasret/company-os/backend/internal/adapter/repository"
	"github.com/hasret/company-os/backend/internal/domain"
	"github.com/hasret/company-os/backend/internal/service"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // For development
	},
}

type ChatHandler struct {
	repo          *repository.PostgresChatRepository
	userRepo      *repository.PostgresUserRepository
	hub           *ChatHub
	notifyService *service.NotificationService
}

func NewChatHandler(
	repo *repository.PostgresChatRepository,
	userRepo *repository.PostgresUserRepository,
	hub *ChatHub,
	notifyService *service.NotificationService,
) *ChatHandler {
	return &ChatHandler{
		repo:          repo,
		userRepo:      userRepo,
		hub:           hub,
		notifyService: notifyService,
	}
}

func (h *ChatHandler) Connect(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID, ok := GetUserID(ctx)
	if !ok {
		log.Printf("CHAT: Failed to get UserID from context")
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("CHAT: Websocket upgrade error for user %s: %v", userID, err)
		return
	}
	log.Printf("CHAT: Websocket upgrade successful for user %s. Connection: %p", userID, conn)

	client := h.hub.Register(userID, conn)
	if client == nil {
		log.Printf("CHAT: Failed to register user %s to hub", userID)
		conn.Close()
		return
	}
	log.Printf("CHAT: User %s successfully registered to hub", userID)

	// Keep connection open and read messages
	defer func() {
		h.hub.Unregister(userID, client)
		conn.Close()
	}()

	for {
		_, payload, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Websocket read error: %v", err)
			}
			break
		}

		var msg domain.ChatMessage
		if err := json.Unmarshal(payload, &msg); err != nil {
			continue
		}

		msg.ID = uuid.New()
		msg.SenderID = userID
		msg.CreatedAt = time.Now().UTC()

		// Fetch sender info
		sender, err := h.userRepo.GetByID(ctx, userID)
		if err == nil {
			msg.Sender = sender
		}

		// Check if recipient is online for delivered status
		members, _ := h.repo.GetRoomMembers(ctx, msg.ChatRoomID)
		isDelivered := false
		for _, m := range members {
			if m.ID != userID && h.hub.IsOnline(m.ID) {
				isDelivered = true
				break
			}
		}
		if isDelivered {
			msg.Status = domain.MessageStatusDelivered
		}

		// Save to DB
		if err := h.repo.SaveMessage(ctx, &msg); err != nil {
			log.Printf("Failed to save message: %v", err)
			continue
		}

		// Trigger Notifications
		go func(m domain.ChatMessage) {
			orgID, _ := GetOrgID(ctx)
			members, err := h.repo.GetRoomMembers(ctx, m.ChatRoomID)
			if err == nil {
				var receivers []uuid.UUID
				for _, mem := range members {
					if mem.ID != m.SenderID {
						receivers = append(receivers, mem.ID)
					}
				}
				if len(receivers) > 0 {
					senderName := "Sistem"
					if m.Sender != nil {
						senderName = fmt.Sprintf("%s %s", m.Sender.FirstName, m.Sender.LastName)
					}
					h.notifyService.NotifyChatMessage(ctx, m.ChatRoomID, receivers, orgID, senderName, m.Content)
				}
			}
		}(msg)

		// Broadcast to others
		h.hub.Broadcast(&msg)
	}
}

func (h *ChatHandler) ListRooms(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	orgID, _ := GetOrgID(ctx)
	userID, _ := GetUserID(ctx)

	rooms, err := h.repo.ListRoomsByOrganization(ctx, orgID, userID)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch rooms")
		return
	}

	json.NewEncoder(w).Encode(rooms)
}

func (h *ChatHandler) GetMessages(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	roomIDStr := chi.URLParam(r, "roomId")
	roomID, err := uuid.Parse(roomIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	userID, _ := GetUserID(ctx)
	messages, err := h.repo.GetMessagesByRoom(ctx, roomID, userID, 50)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch messages")
		return
	}

	json.NewEncoder(w).Encode(messages)
}

func (h *ChatHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	roomIDStr := chi.URLParam(r, "roomId")
	roomID, err := uuid.Parse(roomIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	userID, _ := GetUserID(ctx)
	var msg domain.ChatMessage
	if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid input")
		return
	}

	msg.ID = uuid.New()
	msg.ChatRoomID = roomID
	msg.SenderID = userID
	msg.CreatedAt = time.Now().UTC()
	msg.Status = domain.MessageStatusSent

	// Fetch sender info
	sender, _ := h.userRepo.GetByID(ctx, userID)
	msg.Sender = sender

	// Check if recipient is online for delivered status
	members, _ := h.repo.GetRoomMembers(ctx, roomID)
	isDelivered := false
	for _, m := range members {
		if m.ID != userID && h.hub.IsOnline(m.ID) {
			isDelivered = true
			break
		}
	}
	if isDelivered {
		msg.Status = domain.MessageStatusDelivered
	}

	if err := h.repo.SaveMessage(ctx, &msg); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to save message")
		return
	}

	// Trigger notifications and broadcast
	go func(m domain.ChatMessage) {
		orgID, _ := GetOrgID(ctx)
		members, err := h.repo.GetRoomMembers(ctx, m.ChatRoomID)
		if err == nil {
			var receivers []uuid.UUID
			for _, mem := range members {
				if mem.ID != m.SenderID {
					receivers = append(receivers, mem.ID)
				}
			}
			if len(receivers) > 0 {
				senderName := "Sistem"
				if m.Sender != nil {
					senderName = fmt.Sprintf("%s %s", m.Sender.FirstName, m.Sender.LastName)
				}
				h.notifyService.NotifyChatMessage(ctx, m.ChatRoomID, receivers, orgID, senderName, m.Content)
			}
		}
	}(msg)

	h.hub.Broadcast(&msg)
	json.NewEncoder(w).Encode(msg)
}

func (h *ChatHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	msgIDStr := chi.URLParam(r, "id")
	msgID, err := uuid.Parse(msgIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid message ID")
		return
	}

	if err := h.repo.UpdateMessageStatus(ctx, msgID, domain.MessageStatusRead); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to update status")
		return
	}

	// Notify via WebSocket about status update
	// We can broadcast a special "status update" message or just the message itself with new status
	h.hub.Broadcast(&domain.ChatMessage{
		ID:     msgID,
		Status: domain.MessageStatusRead,
	})

	w.WriteHeader(http.StatusNoContent)
}

func (h *ChatHandler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	orgID, _ := GetOrgID(ctx)

	var req struct {
		domain.ChatRoom
		MemberIDs []uuid.UUID `json:"member_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid input")
		return
	}

	room := req.ChatRoom
	room.ID = uuid.New()
	room.OrganizationID = orgID

	if err := h.repo.CreateRoom(ctx, &room); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to create room")
		return
	}

	// Add creator as member
	userID, _ := GetUserID(ctx)
	h.repo.AddRoomMember(ctx, room.ID, userID)

	// Add other members
	for _, mID := range req.MemberIDs {
		h.repo.AddRoomMember(ctx, room.ID, mID)
	}

	json.NewEncoder(w).Encode(room)

}
func (h *ChatHandler) DeleteMessage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	msgIDStr := chi.URLParam(r, "id")
	msgID, err := uuid.Parse(msgIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid message ID")
		return
	}

	userID, _ := GetUserID(ctx)
	deleteType := r.URL.Query().Get("type")

	if deleteType == "me" {
		if err := h.repo.DeleteMessageForMe(ctx, msgID, userID); err != nil {
			RespondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}
	} else {
		if err := h.repo.DeleteMessage(ctx, msgID, userID); err != nil {
			if err == sql.ErrNoRows {
				RespondWithError(w, http.StatusForbidden, "Message not found or unauthorized")
			} else {
				RespondWithError(w, http.StatusInternalServerError, err.Error())
			}
			return
		}
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ChatHandler) DeleteRoom(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	roomIDStr := chi.URLParam(r, "id")
	roomID, err := uuid.Parse(roomIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	orgID, _ := GetOrgID(ctx)
	if err := h.repo.DeleteRoom(ctx, roomID, orgID); err != nil {
		if err == sql.ErrNoRows {
			RespondWithError(w, http.StatusForbidden, "Room not found or unauthorized")
		} else {
			RespondWithError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ChatHandler) UpdateRoom(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	roomIDStr := chi.URLParam(r, "id")
	roomID, err := uuid.Parse(roomIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid room ID")
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid input")
		return
	}

	if err := h.repo.UpdateRoom(ctx, roomID, req.Name); err != nil {
		RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
