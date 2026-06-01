package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jsolteam/autocontour/internal/database"
	"github.com/jsolteam/autocontour/internal/models"
	"github.com/jsolteam/autocontour/internal/services"
)

const companyNameSettingKey = "company_name"
const defaultCompanyName = "Авто-Контур"

func GetSettings(c *gin.Context) {
	var setting models.AppSetting
	companyName := defaultCompanyName
	if err := database.DB.First(&setting, "key = ?", companyNameSettingKey).Error; err == nil && strings.TrimSpace(setting.Value) != "" {
		companyName = setting.Value
	}
	c.JSON(http.StatusOK, gin.H{"company_name": companyName})
}

func UpdateSettings(c *gin.Context) {
	var input struct {
		CompanyName string `json:"company_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	companyName := strings.TrimSpace(input.CompanyName)
	if companyName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Введите название компании"})
		return
	}
	setting := models.AppSetting{Key: companyNameSettingKey, Value: companyName}
	if err := database.DB.Save(&setting).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить настройки"})
		return
	}
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Изменение системных настроек", "Название компании: "+companyName)
	c.JSON(http.StatusOK, gin.H{"company_name": companyName})
}
