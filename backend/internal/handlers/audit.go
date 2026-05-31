package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jsolteam/autocontour/internal/database"
	"github.com/jsolteam/autocontour/internal/models"
)

func ListAuditLogs(c *gin.Context) {
	var logs []models.AuditLog
	database.DB.Preload("User").Order("created_at DESC").Limit(500).Find(&logs)
	c.JSON(http.StatusOK, logs)
}
