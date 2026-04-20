package handler

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/hasret/company-os/backend/internal/domain"
)

// PresenceUpdate represents a user's online status change
type PresenceUpdate struct {
	Type     string    `json:"type"`
	UserID   uuid.UUID `json:"user_id"`
	Online   bool      `json:"online"`
	LastSeen string    `json:"last_seen"` // ISO Format
}

// Client represents a connected websocket user
type Client struct {
	UserID  uuid.UUID
	Conn    *websocket.Conn
	Send    chan *domain.ChatMessage
	SendRaw chan []byte
}

type ChatHub struct {
	// Registered clients by UserID (multiple clients per user supported)
	clients map[uuid.UUID][]*Client
	// Lock for clients map
	mu sync.RWMutex
	// Message broadcast channel
	broadcast chan *domain.ChatMessage
	// User repository for status updates
	userRepo domain.UserRepository
}

func NewChatHub(userRepo domain.UserRepository) *ChatHub {
	return &ChatHub{
		clients:   make(map[uuid.UUID][]*Client),
		broadcast: make(chan *domain.ChatMessage),
		userRepo:  userRepo,
	}
}

func (h *ChatHub) Run() {
	for message := range h.broadcast {
		h.broadcastToRoom(message)
	}
}

func (h *ChatHub) Register(userID uuid.UUID, conn *websocket.Conn) *Client {
	h.mu.Lock()
	defer h.mu.Unlock()

	client := &Client{
		UserID:  userID,
		Conn:    conn,
		Send:    make(chan *domain.ChatMessage, 256),
		SendRaw: make(chan []byte, 256),
	}
	h.clients[userID] = append(h.clients[userID], client)

	// Start writer for this client
	go h.writePump(client)

	// Update last seen and online status
	go func(uid uuid.UUID) {
		h.userRepo.UpdateLastSeen(context.Background(), uid)
	}(userID)

	// Broadcast presence update
	go h.broadcastPresence(userID, true)

	log.Printf("User %s registered to ChatHub (Connections for user: %d)", userID, len(h.clients[userID]))

	// Send list of currently online users to the NEW connection
	onlineUserIDs := make([]uuid.UUID, 0, len(h.clients))
	for uid := range h.clients {
		onlineUserIDs = append(onlineUserIDs, uid)
	}
	initialPresence := struct {
		Type    string      `json:"type"`
		UserIDs []uuid.UUID `json:"user_ids"`
	}{
		Type:    "initial_presence",
		UserIDs: onlineUserIDs,
	}
	payload, _ := json.Marshal(initialPresence)
	select {
	case client.SendRaw <- payload:
	default:
	}

	return client
}

func (h *ChatHub) Unregister(userID uuid.UUID, client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	clients := h.clients[userID]
	for i, c := range clients {
		if c == client {
			close(c.Send)
			close(c.SendRaw)
			h.clients[userID] = append(clients[:i], clients[i+1:]...)
			break
		}
	}

	if len(h.clients[userID]) == 0 {
		delete(h.clients, userID)
		
		// Update last seen on last disconnect
		go func(uid uuid.UUID) {
			h.userRepo.UpdateLastSeen(context.Background(), uid)
		}(userID)

		// Broadcast presence update
		go h.broadcastPresence(userID, false)

		log.Printf("User %s fully unregistered from ChatHub", userID)
	} else {
		log.Printf("One connection closed for user %s (Remaining: %d)", userID, len(h.clients[userID]))
	}
}

func (h *ChatHub) broadcastToRoom(msg *domain.ChatMessage) {
	h.mu.RLock()
	var clientsToNotify []*Client
	for _, userClients := range h.clients {
		clientsToNotify = append(clientsToNotify, userClients...)
	}
	h.mu.RUnlock()

	for _, client := range clientsToNotify {
		select {
		case client.Send <- msg:
		default:
			log.Printf("BROADCAST: User %s connection buffer full", client.UserID)
		}
	}
}

func (h *ChatHub) writePump(client *Client) {
	defer func() {
		client.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-client.Send:
			if !ok {
				client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			w, err := client.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			json.NewEncoder(w).Encode(message)
			if err := w.Close(); err != nil {
				return
			}
		case raw, ok := <-client.SendRaw:
			if !ok {
				return
			}
			if err := client.Conn.WriteMessage(websocket.TextMessage, raw); err != nil {
				return
			}
		}
	}
}

func (h *ChatHub) broadcastPresence(userID uuid.UUID, online bool) {
	update := PresenceUpdate{
		Type:     "presence_update",
		UserID:   userID,
		Online:   online,
		LastSeen: time.Now().UTC().Format(time.RFC3339),
	}
	payload, _ := json.Marshal(update)
	
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, userClients := range h.clients {
		for _, client := range userClients {
			select {
			case client.SendRaw <- payload:
			default:
			}
		}
	}
}

func (h *ChatHub) Broadcast(msg *domain.ChatMessage) {
	h.broadcastToRoom(msg)
}

func (h *ChatHub) IsOnline(userID uuid.UUID) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	_, online := h.clients[userID]
	return online
}
