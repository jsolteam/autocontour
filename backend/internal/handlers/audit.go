package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jsolteam/autocontour/internal/database"
	"github.com/jsolteam/autocontour/internal/models"
)

func ListAuditLogs(c *gin.Context) {
	var logs []models.AuditLog
	q := database.DB.Preload("User").Order("created_at DESC").Limit(500)
	if userID := c.Query("user_id"); userID != "" {
		q = q.Where("user_id = ?", userID)
	}
	if from := c.Query("from"); from != "" {
		if parsed, err := time.Parse(time.RFC3339, from); err == nil {
			q = q.Where("created_at >= ?", parsed)
		}
	}
	if to := c.Query("to"); to != "" {
		if parsed, err := time.Parse(time.RFC3339, to); err == nil {
			q = q.Where("created_at <= ?", parsed)
		}
	}
	q.Find(&logs)
	c.JSON(http.StatusOK, logs)
}
