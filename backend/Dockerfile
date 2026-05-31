FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/api

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Europe/Moscow
WORKDIR /root/
COPY --from=builder /app/server .
COPY --from=builder /app/.env.example .env
EXPOSE 8080
CMD ["./server"]