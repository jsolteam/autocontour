package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jsolteam/autocontour/internal/database"
	"github.com/jsolteam/autocontour/internal/models"
	"github.com/jsolteam/autocontour/internal/services"
)

// ─── Units of Measure ────────────────────────────

func ListUnits(c *gin.Context) {
	var units []models.UnitOfMeasure
	database.DB.Find(&units)
	c.JSON(http.StatusOK, units)
}

func CreateUnit(c *gin.Context) {
	var unit models.UnitOfMeasure
	if err := c.ShouldBindJSON(&unit); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := database.DB.Create(&unit).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Единица измерения уже существует"})
		return
	}
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Создание ЕИ", fmt.Sprintf("Добавлена ЕИ: %s", unit.Name))
	c.JSON(http.StatusCreated, unit)
}

func UpdateUnit(c *gin.Context) {
	id := c.Param("id")
	var unit models.UnitOfMeasure
	if err := database.DB.First(&unit, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ЕИ не найдена"})
		return
	}
	c.ShouldBindJSON(&unit)
	database.DB.Save(&unit)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Изменение ЕИ", fmt.Sprintf("ЕИ ID=%s изменена", id))
	c.JSON(http.StatusOK, unit)
}

func DeleteUnit(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.UnitOfMeasure{}, id)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Удаление ЕИ", fmt.Sprintf("ЕИ ID=%s удалена", id))
	c.JSON(http.StatusOK, gin.H{"message": "ЕИ удалена"})
}

// ─── Unit Conversions ────────────────────────────

func ListConversions(c *gin.Context) {
	var items []models.UnitConversion
	database.DB.Preload("Nomenclature").Preload("FromUnit").Preload("ToUnit").Find(&items)
	c.JSON(http.StatusOK, items)
}

func CreateConversion(c *gin.Context) {
	var item models.UnitConversion
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if item.Coefficient <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Коэффициент должен быть положительным"})
		return
	}
	database.DB.Create(&item)
	database.DB.Preload("Nomenclature").Preload("FromUnit").Preload("ToUnit").First(&item, item.ID)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Создание конвертации", fmt.Sprintf("Конвертация ID=%d создана", item.ID))
	c.JSON(http.StatusCreated, item)
}

func UpdateConversion(c *gin.Context) {
	id := c.Param("id")
	var item models.UnitConversion
	if err := database.DB.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Конвертация не найдена"})
		return
	}
	c.ShouldBindJSON(&item)
	if item.Coefficient <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Коэффициент должен быть положительным"})
		return
	}
	database.DB.Save(&item)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Изменение конвертации", fmt.Sprintf("Конвертация ID=%s обновлена", id))
	database.DB.Preload("Nomenclature").Preload("FromUnit").Preload("ToUnit").First(&item, item.ID)
	c.JSON(http.StatusOK, item)
}

func DeleteConversion(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.UnitConversion{}, id)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Удаление конвертации", fmt.Sprintf("Конвертация ID=%s удалена", id))
	c.JSON(http.StatusOK, gin.H{"message": "Конвертация удалена"})
}

// ─── Nomenclature ────────────────────────────────

func ListNomenclature(c *gin.Context) {
	var items []models.Nomenclature
	q := database.DB.Preload("BaseUnit")
	if search := c.Query("search"); search != "" {
		q = q.Where("name ILIKE ?", "%"+search+"%")
	}
	if cat := c.Query("category"); cat != "" {
		q = q.Where("category = ?", cat)
	}
	q.Find(&items)
	c.JSON(http.StatusOK, items)
}

func GetNomenclature(c *gin.Context) {
	id := c.Param("id")
	var item models.Nomenclature
	if err := database.DB.Preload("BaseUnit").First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Номенклатура не найдена"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func CreateNomenclature(c *gin.Context) {
	var item models.Nomenclature
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if item.Name == "" || item.Category == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Название и категория обязательны"})
		return
	}
	database.DB.Create(&item)
	database.DB.Preload("BaseUnit").First(&item, item.ID)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Создание номенклатуры", fmt.Sprintf("Добавлена: %s (%s)", item.Name, item.Category))
	c.JSON(http.StatusCreated, item)
}

func UpdateNomenclature(c *gin.Context) {
	id := c.Param("id")
	var item models.Nomenclature
	if err := database.DB.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Номенклатура не найдена"})
		return
	}
	c.ShouldBindJSON(&item)
	database.DB.Save(&item)
	database.DB.Preload("BaseUnit").First(&item, item.ID)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Изменение номенклатуры", fmt.Sprintf("Обновлено ID=%s: %s", id, item.Name))
	c.JSON(http.StatusOK, item)
}

func DeleteNomenclature(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.Nomenclature{}, id)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Удаление номенклатуры", fmt.Sprintf("Удалена номенклатура ID=%s", id))
	c.JSON(http.StatusOK, gin.H{"message": "Номенклатура удалена"})
}

// ─── Finished Products ───────────────────────────

func ListFinishedProducts(c *gin.Context) {
	var items []models.FinishedProduct
	q := database.DB.Preload("BaseUnit")
	if search := c.Query("search"); search != "" {
		q = q.Where("name ILIKE ?", "%"+search+"%")
	}
	q.Find(&items)
	c.JSON(http.StatusOK, items)
}

func GetFinishedProduct(c *gin.Context) {
	id := c.Param("id")
	var item models.FinishedProduct
	if err := database.DB.Preload("BaseUnit").First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Готовая продукция не найдена"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func CreateFinishedProduct(c *gin.Context) {
	var item models.FinishedProduct
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if item.PalletCapacity <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Вместимость паллеты должна быть положительной"})
		return
	}
	database.DB.Create(&item)
	database.DB.Preload("BaseUnit").First(&item, item.ID)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Создание ГП", fmt.Sprintf("Добавлена ГП: %s", item.Name))
	c.JSON(http.StatusCreated, item)
}

func UpdateFinishedProduct(c *gin.Context) {
	id := c.Param("id")
	var item models.FinishedProduct
	if err := database.DB.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ГП не найдена"})
		return
	}
	c.ShouldBindJSON(&item)
	if item.PalletCapacity <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Вместимость паллеты должна быть положительной"})
		return
	}
	database.DB.Save(&item)
	database.DB.Preload("BaseUnit").First(&item, item.ID)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Изменение ГП", fmt.Sprintf("Обновлена ГП ID=%s: %s", id, item.Name))
	c.JSON(http.StatusOK, item)
}

func DeleteFinishedProduct(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.FinishedProduct{}, id)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Удаление ГП", fmt.Sprintf("Удалена ГП ID=%s", id))
	c.JSON(http.StatusOK, gin.H{"message": "ГП удалена"})
}

// ─── Audit ───────────────────────────────────────

func ListAuditLogs(c *gin.Context) {
	var logs []models.AuditLog
	q := database.DB.Preload("User").Order("created_at DESC")
	if from := c.Query("from"); from != "" {
		q = q.Where("created_at >= ?", from)
	}
	if to := c.Query("to"); to != "" {
		q = q.Where("created_at <= ?", to)
	}
	if userID := c.Query("user_id"); userID != "" {
		q = q.Where("user_id = ?", userID)
	}
	q.Limit(500).Find(&logs)
	c.JSON(http.StatusOK, logs)
}