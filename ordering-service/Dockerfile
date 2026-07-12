FROM golang:1.25-alpine AS builder

ARG TARGETARCH=amd64

WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH} go build -ldflags="-w -s" -o /app/server ./cmd/server

FROM alpine:3.21

RUN apk add --no-cache ca-certificates wget

COPY --from=builder /app/server /server
COPY --from=builder /app/migrations /migrations

RUN adduser -D -u 1001 appuser
USER appuser

EXPOSE 8080

CMD ["/server"]
