package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type CallSignal struct {
	Type      string          `json:"type"` // "join", "leave", "offer", "answer", "candidate", "ready"
	SenderID  uuid.UUID       `json:"sender_id"`
	TargetID  uuid.UUID       `json:"target_id"` // Used for direct signaling
	MeetingID uuid.UUID       `json:"meeting_id"`
	Payload   json.RawMessage `json:"payload"`
}

type CallClient struct {
	UserID    uuid.UUID
	MeetingID uuid.UUID
	Conn      *websocket.Conn
	Send      chan CallSignal
}

type CallHub struct {
	// Map of meeting_id -> list of clients
	Rooms      map[uuid.UUID]map[uuid.UUID]*CallClient
	Register   chan *CallClient
	Unregister chan *CallClient
	Broadcast  chan CallSignal
	mu         sync.RWMutex
}

func NewCallHub() *CallHub {
	return &CallHub{
		Rooms:      make(map[uuid.UUID]map[uuid.UUID]*CallClient),
		Register:   make(chan *CallClient),
		Unregister: make(chan *CallClient),
		Broadcast:  make(chan CallSignal),
	}
}

func (h *CallHub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			if _, ok := h.Rooms[client.MeetingID]; !ok {
				h.Rooms[client.MeetingID] = make(map[uuid.UUID]*CallClient)
			}
			h.Rooms[client.MeetingID][client.UserID] = client
			h.mu.Unlock()
			log.Printf("CALL: User %s joined meeting %s", client.UserID, client.MeetingID)

		case client := <-h.Unregister:
			h.mu.Lock()
			if room, ok := h.Rooms[client.MeetingID]; ok {
				if _, ok := room[client.UserID]; ok {
					delete(room, client.UserID)
					close(client.Send)
					if len(room) == 0 {
						delete(h.Rooms, client.MeetingID)
					}
				}
			}
			h.mu.Unlock()
			log.Printf("CALL: User %s left meeting %s", client.UserID, client.MeetingID)

		case signal := <-h.Broadcast:
			h.mu.RLock()
			room, ok := h.Rooms[signal.MeetingID]
			if ok {
				if signal.TargetID != uuid.Nil {
					// Direct signaling
					if target, ok := room[signal.TargetID]; ok {
						select {
						case target.Send <- signal:
						default:
							log.Printf("CALL: Target client %s disconnected", signal.TargetID)
						}
					}
				} else {
					// Broadcast to all in room except sender
					for _, client := range room {
						if client.UserID != signal.SenderID {
							select {
							case client.Send <- signal:
							default:
								log.Printf("CALL: Client %s buffer full, skipping", client.UserID)
							}
						}
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

type CallHandler struct {
	Hub *CallHub
}

func NewCallHandler(hub *CallHub) *CallHandler {
	return &CallHandler{Hub: hub}
}

func (h *CallHandler) Connect(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID, _ := GetUserID(ctx)
	meetingIDStr := r.URL.Query().Get("meetingId")
	meetingID, err := uuid.Parse(meetingIDStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid meeting ID")
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("CALL WS: Upgrade error: %v", err)
		return
	}

	client := &CallClient{
		UserID:    userID,
		MeetingID: meetingID,
		Conn:      conn,
		Send:      make(chan CallSignal, 256),
	}

	h.Hub.Register <- client

	// Read pump
	go func() {
		defer func() {
			h.Hub.Unregister <- client
			conn.Close()
		}()
		for {
			_, payload, err := conn.ReadMessage()
			if err != nil {
				break
			}
			var signal CallSignal
			if err := json.Unmarshal(payload, &signal); err != nil {
				continue
			}
			signal.SenderID = userID
			signal.MeetingID = meetingID
			h.Hub.Broadcast <- signal
		}
	}()

	// Write pump
	go func() {
		for signal := range client.Send {
			payload, _ := json.Marshal(signal)
			conn.WriteMessage(websocket.TextMessage, payload)
		}
	}()
}
