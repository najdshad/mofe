package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/mofe-menu/ordering-service/internal/middleware"
	"github.com/mofe-menu/ordering-service/internal/models"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type Client struct {
	conn    *websocket.Conn
	send    chan []byte
	venueID string
	userID  string
	hub     *Hub
}

type Hub struct {
	clients    map[string]map[*Client]bool
	broadcast  chan *Message
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

type Message struct {
	VenueID string          `json:"-"`
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

const (
	EventOrderCreated       = "order_created"
	EventItemAdded          = "item_added"
	EventItemStatusChanged  = "item_status_changed"
	EventOrderStatusChanged = "order_status_changed"
	EventItemCancelled      = "item_cancelled"
	EventItemUpdated         = "item_updated"
	EventItemUnavailable     = "menu_item_unavailable"
)

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]map[*Client]bool),
		broadcast:  make(chan *Message, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.clients[client.venueID] == nil {
				h.clients[client.venueID] = make(map[*Client]bool)
			}
			h.clients[client.venueID][client] = true
			h.mu.Unlock()
			slog.Info("WebSocket client connected",
				"venueId", client.venueID,
				"userId", client.userID,
			)

		case client := <-h.unregister:
			h.mu.Lock()
			if clients, ok := h.clients[client.venueID]; ok {
				if _, exists := clients[client]; exists {
					delete(clients, client)
					close(client.send)
				}
				if len(clients) == 0 {
					delete(h.clients, client.venueID)
				}
			}
			h.mu.Unlock()
			slog.Info("WebSocket client disconnected",
				"venueId", client.venueID,
				"userId", client.userID,
			)

		case message := <-h.broadcast:
			h.mu.RLock()
			clients := h.clients[message.VenueID]
			h.mu.RUnlock()

			data, err := json.Marshal(message)
			if err != nil {
				slog.Error("Failed to marshal WebSocket message", "error", err)
				continue
			}

			for client := range clients {
				select {
				case client.send <- data:
				default:
					h.mu.Lock()
					close(client.send)
					delete(h.clients[message.VenueID], client)
					h.mu.Unlock()
				}
			}

		case <-ticker.C:
			h.mu.RLock()
			for _, clients := range h.clients {
				for client := range clients {
					if err := client.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
						slog.Debug("WebSocket ping failed, unregistering client",
							"userId", client.userID,
						)
						go func(c *Client) {
							h.unregister <- c
						}(client)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) BroadcastToVenue(venueID, msgType string, payload interface{}) {
	data, err := json.Marshal(payload)
	if err != nil {
		slog.Error("Failed to marshal broadcast payload", "error", err)
		return
	}
	h.broadcast <- &Message{
		VenueID: venueID,
		Type:    msgType,
		Payload: data,
	}
}

func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSession(r.Context())
	if session == nil {
		models.WriteError(w, http.StatusUnauthorized, "Unauthorized", "NO_SESSION")
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("WebSocket upgrade failed", "error", err)
		return
	}

	client := &Client{
		conn:    conn,
		send:    make(chan []byte, 256),
		venueID: session.VenueID,
		userID:  session.UserID,
		hub:     h,
	}

	h.register <- client

	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(4096)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		var msg Message
		if err := c.conn.ReadJSON(&msg); err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				slog.Debug("WebSocket read error", "error", err)
			}
			break
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
