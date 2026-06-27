package models

import "time"

type OrderStatus string

const (
	OrderStatusDraft     OrderStatus = "DRAFT"
	OrderStatusPending   OrderStatus = "PENDING"
	OrderStatusSent      OrderStatus = "SENT"
	OrderStatusInProgress OrderStatus = "IN_PROGRESS"
	OrderStatusReady     OrderStatus = "READY"
	OrderStatusDelivered OrderStatus = "DELIVERED"
	OrderStatusCancelled OrderStatus = "CANCELLED"
)

type ItemStatus string

const (
	ItemStatusPending   ItemStatus = "PENDING"
	ItemStatusSent      ItemStatus = "SENT"
	ItemStatusPreparing ItemStatus = "PREPARING"
	ItemStatusReady     ItemStatus = "READY"
	ItemStatusDelivered ItemStatus = "DELIVERED"
	ItemStatusCancelled ItemStatus = "CANCELLED"
)

type Station string

const (
	StationKitchen Station = "KITCHEN"
	StationBar     Station = "BAR"
)

type Order struct {
	ID             string       `json:"id"`
	VenueID        string       `json:"venueId"`
	WaiterID       string       `json:"waiterId"`
	TableNumber    *string      `json:"tableNumber"`
	GuestCount     int          `json:"guestCount"`
	Status         OrderStatus  `json:"status"`
	Subtotal       int          `json:"subtotal"`
	Total          int          `json:"total"`
	Notes          *string      `json:"notes"`
	CreatedAt      time.Time    `json:"createdAt"`
	SentToKitchenAt *time.Time  `json:"sentToKitchenAt"`
	ReadyAt        *time.Time   `json:"readyAt"`
	DeliveredAt    *time.Time   `json:"deliveredAt"`
	CancelledAt    *time.Time   `json:"cancelledAt"`
	CreatedByName  string       `json:"createdBy"`
	Items          []OrderItem  `json:"items,omitempty"`
}

type OrderItem struct {
	ID           string     `json:"id"`
	OrderID      string     `json:"orderId"`
	MenuItemID   string     `json:"menuItemId"`
	MenuItemName string     `json:"menuItemName"`
	VariantID    *string    `json:"variantId,omitempty"`
	VariantName  *string    `json:"variantName,omitempty"`
	Quantity     int        `json:"quantity"`
	UnitPrice    int        `json:"unitPrice"`
	TotalPrice   int        `json:"totalPrice"`
	Station      Station    `json:"station"`
	Status       ItemStatus `json:"status"`
	Notes        *string    `json:"notes,omitempty"`
	SentAt       *time.Time `json:"sentAt,omitempty"`
	PreparingAt  *time.Time `json:"preparingAt,omitempty"`
	ReadyAt      *time.Time `json:"readyAt,omitempty"`
	DeliveredAt  *time.Time `json:"deliveredAt,omitempty"`
	CancelledAt  *time.Time `json:"cancelledAt,omitempty"`
	CourseNumber int        `json:"courseNumber"`
}
