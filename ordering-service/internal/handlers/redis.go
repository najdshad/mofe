package handlers

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

const redisChannelPrefix = "ws:venue:"

type RedisPubSub struct {
	client *redis.Client
	ctx    context.Context
	pubsub *redis.PubSub
}

func NewRedisPubSub(ctx context.Context, redisURL string) (*RedisPubSub, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}

	client := redis.NewClient(opts)

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	pubsub := client.Subscribe(ctx)
	go func() {
		<-ctx.Done()
		pubsub.Close()
		client.Close()
	}()

	slog.Info("Redis pub/sub connected")
	return &RedisPubSub{
		client: client,
		ctx:    ctx,
		pubsub: pubsub,
	}, nil
}

func (r *RedisPubSub) Publish(venueID, msgType string, payload interface{}) error {
	return r.PublishToChannel(channelForVenue(venueID), msgType, payload)
}

func (r *RedisPubSub) Subscribe(venueID string) error {
	return r.SubscribeToChannel(channelForVenue(venueID))
}

func (r *RedisPubSub) Unsubscribe(venueID string) error {
	return r.UnsubscribeFromChannel(channelForVenue(venueID))
}

func (r *RedisPubSub) Channel() <-chan *Message {
	ch := make(chan *Message, 256)
	go func() {
		redisCh := r.pubsub.Channel(
			redis.WithChannelSize(256),
			redis.WithChannelHealthCheckInterval(30*time.Second),
		)
		for {
			select {
			case <-r.ctx.Done():
				close(ch)
				return
			case redisMsg, ok := <-redisCh:
				if !ok {
					close(ch)
					return
				}
				var parsed Message
				if err := json.Unmarshal([]byte(redisMsg.Payload), &parsed); err != nil {
					slog.Error("Failed to unmarshal Redis pub/sub message", "error", err)
					continue
				}
				venueID := venueIDFromChannel(redisMsg.Channel)
				parsed.VenueID = venueID
				ch <- &parsed
			}
		}
	}()
	return ch
}

func venueIDFromChannel(channel string) string {
	prefix := redisChannelPrefix
	if len(channel) > len(prefix) {
		return channel[len(prefix):]
	}
	return channel
}

func channelForVenue(venueID string) string {
	return redisChannelPrefix + venueID
}

func (r *RedisPubSub) PublishToChannel(channel, msgType string, payload interface{}) error {
	msg := &Message{
		Type:    msgType,
		Payload: nil,
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	msg.Payload = data

	msgData, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	return r.client.Publish(r.ctx, channel, msgData).Err()
}

func (r *RedisPubSub) SubscribeToChannel(channel string) error {
	return r.pubsub.Subscribe(r.ctx, channel)
}

func (r *RedisPubSub) UnsubscribeFromChannel(channel string) error {
	return r.pubsub.Unsubscribe(r.ctx, channel)
}

func (r *RedisPubSub) Close() error {
	if err := r.pubsub.Close(); err != nil {
		return err
	}
	return r.client.Close()
}
