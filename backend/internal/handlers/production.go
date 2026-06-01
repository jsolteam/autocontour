package handlers

import (
	"fmt"
	"math"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jsolteam/autocontour/internal/database"
	"github.com/jsolteam/autocontour/internal/models"
	"github.com/jsolteam/autocontour/internal/services"
	"gorm.io/gorm"
)

type initializePlanInput struct {
	RecipeID       uint    `json:"recipe_id" binding:"required"`
	TargetQuantity float64 `json:"target_quantity" binding:"required"`
}

func ListProductionPlans(c *gin.Context) {
	var items []models.ProductionPlan
	q := database.DB.Preload("Recipe").Preload("FinishedProduct.BaseUnit").Order("created_at DESC")
	if status := c.Query("status"); status != "" {
		q = q.Where("status = ?", status)
	}
	q.Find(&items)
	c.JSON(http.StatusOK, items)
}

func InitializeProductionPlan(c *gin.Context) {
	var input initializePlanInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.TargetQuantity <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Целевое количество должно быть положительным"})
		return
	}
	var recipe models.Recipe
	if err := recipePreloads(database.DB).First(&recipe, input.RecipeID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Рецепт не найден"})
		return
	}
	factor := input.TargetQuantity / recipe.OutputQuantity
	shortages := []string{}
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		for _, line := range recipe.RawItems {
			required := line.Quantity * factor
			var prod models.ProductionStockRaw
			tx.Where("raw_material_id = ?", line.RawMaterialID).FirstOrInit(&prod)
			availableProd := prod.CurrentStock
			deficit := math.Max(0, required-availableProd)
			if deficit > 0 {
				var main models.MainStockRaw
				tx.Where("raw_material_id = ?", line.RawMaterialID).FirstOrInit(&main)
				if main.CurrentStock+0.0001 < deficit {
					shortages = append(shortages, fmt.Sprintf("%s: не хватает %.4g", line.RawMaterial.Name, deficit-main.CurrentStock))
					continue
				}
				main.CurrentStock -= deficit
				prod.RawMaterialID = line.RawMaterialID
				prod.CurrentStock += deficit
				if err := tx.Save(&main).Error; err != nil {
					return err
				}
				if err := tx.Save(&prod).Error; err != nil {
					return err
				}
			}
		}
		for _, line := range recipe.MaterialItems {
			required := line.Quantity * factor
			var prod models.ProductionStockMaterial
			tx.Where("production_material_id = ?", line.ProductionMaterialID).FirstOrInit(&prod)
			deficit := math.Max(0, required-prod.CurrentStock)
			if deficit > 0 {
				var main models.MainStockMaterial
				tx.Where("production_material_id = ?", line.ProductionMaterialID).FirstOrInit(&main)
				if main.CurrentStock+0.0001 < deficit {
					shortages = append(shortages, fmt.Sprintf("%s: не хватает %.4g", line.ProductionMaterial.Name, deficit-main.CurrentStock))
					continue
				}
				main.CurrentStock -= deficit
				prod.ProductionMaterialID = line.ProductionMaterialID
				prod.CurrentStock += deficit
				if err := tx.Save(&main).Error; err != nil {
					return err
				}
				if err := tx.Save(&prod).Error; err != nil {
					return err
				}
			}
		}
		if len(shortages) > 0 {
			return fmt.Errorf("недостаточно остатков: %v", shortages)
		}
		plan := models.ProductionPlan{RecipeID: recipe.ID, FinishedProductID: recipe.FinishedProductID, TargetQuantity: input.TargetQuantity, Status: models.ProductionPlanInProgress}
		return tx.Create(&plan).Error
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "shortages": shortages})
		return
	}
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Запуск производственного плана", fmt.Sprintf("Рецепт ID=%d, цель=%.4g", input.RecipeID, input.TargetQuantity))
	c.JSON(http.StatusCreated, gin.H{"message": "План запущен"})
}
