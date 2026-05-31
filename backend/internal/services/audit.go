package services

import (
	"github.com/jsolteam/autocontour/internal/database"
	"github.com/jsolteam/autocontour/internal/models"
)

func LogAction(userID uint, action, details string) {
	entry := models.AuditLog{
		UserID:  userID,
		Action:  action,
		Details: details,
	}
	database.DB.Create(&entry)
}