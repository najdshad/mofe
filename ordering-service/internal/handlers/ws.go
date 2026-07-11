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

var allowedOrigins = map[string]bool{
	"https://admin.mofe.ir":     true,
	"http://localhost:3000":     true,
	"https://admin.noghteh.ir":  true,
}

func isAllowedOrigin(origin string) bool {
	return allowedOrigins[origin]
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return isAllowedOrigin(r.Header.Get("Origin"))
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
	clients     map[string]map[*Client]bool
	broadcast   chan *Message
	register    chan *Client
	unregister  chan *Client
	stop        chan struct{}
	mu          sync.RWMutex
	redisPubSub *RedisPubSub
	redisCh     <-chan *Message
}

type Message struct {
	VenueID string          `json:"-"`
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

func NewHubWithRedis(rps *RedisPubSub) *Hub {
	h := NewHub()
	h.redisPubSub = rps
	h.redisCh = rps.Channel()
	return h
}

const (
	EventOrderCreated       = "order_created"
	EventItemAdded          = "item_added"
	EventItemStatusChanged  = "item_status_changed"
	EventOrderStatusChanged = "order_status_changed"
	EventOrderCompleted     = "order_completed"
	EventItemCancelled      = "item_cancelled"
	EventItemUpdated        = "item_updated"
	EventItemUnavailable    = "menu_item_unavailable"
	EventTableReleased      = "table_released"
)

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]map[*Client]bool),
		broadcast:  make(chan *Message, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client, 1000),
		stop:       make(chan struct{}),
	}
}

func (h *Hub) Shutdown() {
	close(h.stop)
}

func (h *Hub) Run() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		var redisCh <-chan *Message
		if h.redisPubSub != nil && h.redisCh != nil {
			redisCh = h.redisCh
		}

		select {
		case client := <-h.register:
			h.mu.Lock()
			wasEmpty := h.clients[client.venueID] == nil
			if wasEmpty {
				h.clients[client.venueID] = make(map[*Client]bool)
			}
			h.clients[client.venueID][client] = true
			venueID := client.venueID
			h.mu.Unlock()

			if wasEmpty && h.redisPubSub != nil {
				if err := h.redisPubSub.Subscribe(venueID); err != nil {
					slog.Error("Failed to subscribe to Redis channel",
						"venueId", venueID, "error", err)
				}
			}

			slog.Info("WebSocket client connected",
				"venueId", venueID,
				"userId", client.userID,
			)

		case client := <-h.unregister:
			h.mu.Lock()
			var venueEmpty bool
			venueID := client.venueID
			if clients, ok := h.clients[venueID]; ok {
				if _, exists := clients[client]; exists {
					delete(clients, client)
					close(client.send)
				}
				venueEmpty = len(clients) == 0
				if venueEmpty {
					delete(h.clients, venueID)
				}
			}
			h.mu.Unlock()

			if venueEmpty && h.redisPubSub != nil {
				if err := h.redisPubSub.Unsubscribe(venueID); err != nil {
					slog.Error("Failed to unsubscribe from Redis channel",
						"venueId", venueID, "error", err)
				}
			}

			slog.Info("WebSocket client disconnected",
				"venueId", venueID,
				"userId", client.userID,
			)

		case message := <-h.broadcast:
			h.mu.RLock()
			clients := h.clients[message.VenueID]
			h.mu.RUnlock()

			if h.redisPubSub != nil {
				if err := h.redisPubSub.Publish(message.VenueID, message.Type, message.Payload); err != nil {
					slog.Error("Failed to publish to Redis",
						"venueId", message.VenueID,
						"type", message.Type,
						"error", err,
					)
				}
			}

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

		case redisMsg := <-redisCh:
			h.mu.RLock()
			clients := h.clients[redisMsg.VenueID]
			h.mu.RUnlock()

			data, err := json.Marshal(redisMsg)
			if err != nil {
				slog.Error("Failed to marshal Redis relay message", "error", err)
				continue
			}

			for client := range clients {
				select {
				case client.send <- data:
				default:
					h.mu.Lock()
					close(client.send)
					delete(h.clients[redisMsg.VenueID], client)
					h.mu.Unlock()
				}
			}

		case <-ticker.C:
			var allClients []*Client
			h.mu.RLock()
			for _, clients := range h.clients {
				for client := range clients {
					allClients = append(allClients, client)
				}
			}
			h.mu.RUnlock()

			for _, client := range allClients {
				client.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if err := client.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					slog.Debug("WebSocket ping failed, unregistering client",
						"userId", client.userID,
					)
					select {
					case h.unregister <- client:
					default:
						slog.Warn("Unregister channel full, dropping client",
							"userId", client.userID,
						)
					}
				}
				client.conn.SetWriteDeadline(time.Time{})
			}

		case <-h.stop:
			slog.Info("Hub shutting down")
			return
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
				c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
