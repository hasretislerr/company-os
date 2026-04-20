package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/hasret/company-os/backend/internal/adapter/messaging"
	"github.com/hasret/company-os/backend/internal/adapter/search"
	"github.com/redis/go-redis/v9"
)

type HealthHandler struct {
	db  *sql.DB
	es  *search.Elasticsearch
	rmq *messaging.RabbitMQ
	rdb *redis.Client
}

func NewHealthHandler(db *sql.DB, es *search.Elasticsearch, rmq *messaging.RabbitMQ, rdb *redis.Client) *HealthHandler {
	return &HealthHandler{
		db:  db,
		es:  es,
		rmq: rmq,
		rdb: rdb,
	}
}

type HealthResponse struct {
	Status    string            `json:"status"`
	Timestamp time.Time         `json:"timestamp"`
	Services  map[string]string `json:"services"`
}

func (h *HealthHandler) Check(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	overallStatus := "UP"
	services := make(map[string]string)

	// DB Check
	if err := h.db.PingContext(ctx); err != nil {
		services["database"] = "DOWN: " + err.Error()
		overallStatus = "DEGRADED"
	} else {
		services["database"] = "OK"
	}

	// Elasticsearch Check
	if h.es != nil && h.es.Client != nil {
		_, err := h.es.Client.Info().Do(ctx)
		if err != nil {
			services["elasticsearch"] = "DOWN: " + err.Error()
			overallStatus = "DEGRADED"
		} else {
			services["elasticsearch"] = "OK"
		}
	} else {
		services["elasticsearch"] = "DISABLED"
	}

	// RabbitMQ Check - simple check if channel is open
	if h.rmq != nil && h.rmq.Channel() != nil && !h.rmq.Channel().IsClosed() {
		services["rabbitmq"] = "OK"
	} else {
		services["rabbitmq"] = "DOWN or DISCONNECTED"
		overallStatus = "DEGRADED"
	}

	// Redis Check
	if h.rdb != nil {
		if err := h.rdb.Ping(ctx).Err(); err != nil {
			services["redis"] = "DOWN: " + err.Error()
			overallStatus = "DEGRADED"
		} else {
			services["redis"] = "OK"
		}
	} else {
		services["redis"] = "DISABLED"
	}

	resp := HealthResponse{
		Status:    overallStatus,
		Timestamp: time.Now(),
		Services:  services,
	}

	w.Header().Set("Content-Type", "application/json")
	if overallStatus == "DEGRADED" {
		w.WriteHeader(http.StatusServiceUnavailable)
	} else {
		w.WriteHeader(http.StatusOK)
	}
	json.NewEncoder(w).Encode(resp)
}
