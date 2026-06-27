package models

import "time"

type Session struct {
	UserID    string
	VenueID   string
	Role      string
	ExpiresAt time.Time
}
