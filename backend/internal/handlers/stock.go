package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jsolteam/autocontour/internal/database"
	"github.com/jsolteam/autocontour/internal/models"
	"github.com/jsolteam/autocontour/internal/services"
)

func ListMainStockRaw(c *gin.Context) {
	var items []models.MainStockRaw
	database.DB.Preload("RawMaterial.Category").Preload("RawMaterial.BaseUnit").Order("raw_material_id").Find(&items)
	c.JSON(http.StatusOK, items)
}

func UpsertMainStockRaw(c *gin.Context) {
	var input struct {
		RawMaterialID uint    `json:"raw_material_id" binding:"required"`
		CurrentStock  float64 `json:"current_stock"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.CurrentStock < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Остаток сырья не может быть отрицательным"})
		return
	}
	var count int64
	database.DB.Model(&models.RawMaterial{}).Where("id = ?", input.RawMaterialID).Count(&count)
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Сырьё не найдено"})
		return
	}
	var item models.MainStockRaw
	database.DB.Where("raw_material_id = ?", input.RawMaterialID).FirstOrInit(&item)
	item.RawMaterialID = input.RawMaterialID
	item.CurrentStock = input.CurrentStock
	database.DB.Save(&item)
	database.DB.Preload("RawMaterial.Category").Preload("RawMaterial.BaseUnit").First(&item, item.ID)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Изменение основного склада сырья", fmt.Sprintf("Сырьё ID=%d, остаток=%f", input.RawMaterialID, input.CurrentStock))
	c.JSON(http.StatusOK, item)
}

func ListMainStockMaterials(c *gin.Context) {
	var items []models.MainStockMaterial
	database.DB.Preload("ProductionMaterial.Category").Preload("ProductionMaterial.BaseUnit").Preload("ProductionMaterial.CapacityUnit").Order("production_material_id").Find(&items)
	c.JSON(http.StatusOK, items)
}

func UpsertMainStockMaterial(c *gin.Context) {
	var input struct {
		ProductionMaterialID uint    `json:"production_material_id" binding:"required"`
		CurrentStock         float64 `json:"current_stock"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.CurrentStock < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Остаток материалов не может быть отрицательным"})
		return
	}
	var count int64
	database.DB.Model(&models.ProductionMaterial{}).Where("id = ?", input.ProductionMaterialID).Count(&count)
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Материал не найден"})
		return
	}
	var item models.MainStockMaterial
	database.DB.Where("production_material_id = ?", input.ProductionMaterialID).FirstOrInit(&item)
	item.ProductionMaterialID = input.ProductionMaterialID
	item.CurrentStock = input.CurrentStock
	database.DB.Save(&item)
	database.DB.Preload("ProductionMaterial.Category").Preload("ProductionMaterial.BaseUnit").Preload("ProductionMaterial.CapacityUnit").First(&item, item.ID)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Изменение основного склада материалов", fmt.Sprintf("Материал ID=%d, остаток=%f", input.ProductionMaterialID, input.CurrentStock))
	c.JSON(http.StatusOK, item)
}
