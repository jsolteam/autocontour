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
	q := database.DB.Preload("Recipe.RawItems.RawMaterial.BaseUnit").Preload("Recipe.RawItems.Unit").Preload("Recipe.MaterialItems.ProductionMaterial.BaseUnit").Preload("FinishedProduct.BaseUnit").Order("created_at DESC")
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
			productionUnitID := rawProductionUnitID(line)
			var prod models.ProductionStockRaw
			tx.Where("raw_material_id = ?", line.RawMaterialID).FirstOrInit(&prod)
			productionStock, err := productionRawStockInUnit(prod, line.RawMaterial, productionUnitID)
			if err != nil {
				shortages = append(shortages, fmt.Sprintf("%s: нет коэффициента перевода производственного остатка", line.RawMaterial.Name))
				continue
			}
			deficit := math.Max(0, required-productionStock)
			if deficit > 0 {
				movedToProduction, err := moveWholeRawPackages(tx, line.RawMaterial, productionUnitID, deficit)
				if err != nil {
					shortages = append(shortages, err.Error())
					continue
				}
				prod.RawMaterialID = line.RawMaterialID
				prod.UnitID = &productionUnitID
				prod.CurrentStock = productionStock + movedToProduction
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
	services.LogAction(actorID.(uint), "Запуск производственного плана", fmt.Sprintf("Рецепт %s, цель=%.4g", recipe.Name, input.TargetQuantity))
	c.JSON(http.StatusCreated, gin.H{"message": "План запущен"})
}

func CompleteProductionPlan(c *gin.Context) {
	id := c.Param("id")
	var plan models.ProductionPlan
	if err := database.DB.Preload("Recipe.RawItems.RawMaterial").Preload("Recipe.MaterialItems.ProductionMaterial").Preload("FinishedProduct").First(&plan, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "План не найден"})
		return
	}
	if plan.Status == models.ProductionPlanCompleted {
		c.JSON(http.StatusBadRequest, gin.H{"error": "План уже завершен"})
		return
	}
	if plan.Status == models.ProductionPlanCanceled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Отмененный план нельзя завершить"})
		return
	}
	factor := plan.TargetQuantity / plan.Recipe.OutputQuantity
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		for _, line := range plan.Recipe.RawItems {
			required := line.Quantity * factor
			productionUnitID := rawProductionUnitID(line)
			var stock models.ProductionStockRaw
			if err := tx.Where("raw_material_id = ?", line.RawMaterialID).First(&stock).Error; err != nil {
				return fmt.Errorf("на складе производства нет сырья %s", line.RawMaterial.Name)
			}
			productionStock, err := productionRawStockInUnit(stock, line.RawMaterial, productionUnitID)
			if err != nil {
				return fmt.Errorf("нет коэффициента перевода производственного остатка сырья %s", line.RawMaterial.Name)
			}
			if productionStock+0.0001 < required {
				return fmt.Errorf("недостаточно сырья %s на складе производства", line.RawMaterial.Name)
			}
			stock.UnitID = &productionUnitID
			stock.CurrentStock = productionStock - required
			if err := tx.Save(&stock).Error; err != nil {
				return err
			}
		}
		for _, line := range plan.Recipe.MaterialItems {
			required := line.Quantity * factor
			var stock models.ProductionStockMaterial
			if err := tx.Where("production_material_id = ?", line.ProductionMaterialID).First(&stock).Error; err != nil {
				return fmt.Errorf("на складе производства нет материала %s", line.ProductionMaterial.Name)
			}
			if stock.CurrentStock+0.0001 < required {
				return fmt.Errorf("недостаточно материала %s на складе производства", line.ProductionMaterial.Name)
			}
			stock.CurrentStock -= required
			if err := tx.Save(&stock).Error; err != nil {
				return err
			}
		}
		var finished models.ProductionStockFinished
		tx.Where("finished_product_id = ?", plan.FinishedProductID).FirstOrInit(&finished)
		finished.FinishedProductID = plan.FinishedProductID
		finished.CurrentStockUnits += plan.TargetQuantity
		if err := tx.Save(&finished).Error; err != nil {
			return err
		}
		plan.Status = models.ProductionPlanCompleted
		return tx.Save(&plan).Error
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Завершение производственного плана", fmt.Sprintf("План #%s, продукция %s", id, plan.FinishedProduct.Name))
	c.JSON(http.StatusOK, gin.H{"message": "План завершен"})
}

type packPalletsInput struct {
	FinishedProductID uint    `json:"finished_product_id" binding:"required"`
	Pallets           float64 `json:"pallets" binding:"required"`
}

func PackFinishedToPallets(c *gin.Context) {
	var input packPalletsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.Pallets <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Количество паллет должно быть положительным"})
		return
	}
	if math.Abs(input.Pallets-math.Round(input.Pallets)) > 0.0001 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Количество паллет должно быть целым"})
		return
	}
	var fp models.FinishedProduct
	if err := database.DB.First(&fp, input.FinishedProductID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ГП не найдена"})
		return
	}
	units := input.Pallets * float64(fp.PalletCapacity)
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var production models.ProductionStockFinished
		if err := tx.Where("finished_product_id = ?", input.FinishedProductID).First(&production).Error; err != nil {
			return fmt.Errorf("нет цехового остатка ГП")
		}
		if production.CurrentStockUnits+0.0001 < units {
			return fmt.Errorf("недостаточно ГП в производстве: нужно %.4g шт", units)
		}
		production.CurrentStockUnits -= units
		if err := tx.Save(&production).Error; err != nil {
			return err
		}
		var main models.MainStockFinished
		tx.Where("finished_product_id = ?", input.FinishedProductID).FirstOrInit(&main)
		main.FinishedProductID = input.FinishedProductID
		main.CurrentStockUnits += units
		main.CurrentStockPallets += input.Pallets
		return tx.Save(&main).Error
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Упаковка ГП в паллеты", fmt.Sprintf("ГП ID=%d, паллет=%.4g", input.FinishedProductID, input.Pallets))
	c.JSON(http.StatusOK, gin.H{"message": "ГП упакована в паллеты"})
}

func rawProductionUnitID(line models.RecipeRawMaterial) uint {
	if line.UnitID != nil {
		return *line.UnitID
	}
	return line.RawMaterial.BaseUnitID
}

func productionRawStockInUnit(stock models.ProductionStockRaw, raw models.RawMaterial, targetUnitID uint) (float64, error) {
	stockUnitID := raw.BaseUnitID
	if stock.UnitID != nil {
		stockUnitID = *stock.UnitID
	}
	return convertRawQuantityBetweenUnits(stock.CurrentStock, raw.ID, stockUnitID, targetUnitID)
}

func moveWholeRawPackages(tx *gorm.DB, raw models.RawMaterial, productionUnitID uint, deficitInProductionUnit float64) (float64, error) {
	var main models.MainStockRaw
	tx.Where("raw_material_id = ?", raw.ID).FirstOrInit(&main)
	main.RawMaterialID = raw.ID

	mainUnitsNeeded, err := convertRawQuantityBetweenUnits(deficitInProductionUnit, raw.ID, productionUnitID, raw.BaseUnitID)
	if err != nil {
		return 0, fmt.Errorf("%s: нет коэффициента перевода в складскую ЕИ", raw.Name)
	}
	mainUnitsToMove := math.Ceil(mainUnitsNeeded - 0.0001)
	if mainUnitsToMove < 1 {
		mainUnitsToMove = 1
	}
	if main.CurrentStock+0.0001 < mainUnitsToMove {
		return 0, fmt.Errorf("%s: не хватает %.4g", raw.Name, mainUnitsToMove-main.CurrentStock)
	}
	movedToProduction, err := convertRawQuantityBetweenUnits(mainUnitsToMove, raw.ID, raw.BaseUnitID, productionUnitID)
	if err != nil {
		return 0, fmt.Errorf("%s: нет коэффициента перевода из складской ЕИ", raw.Name)
	}
	main.CurrentStock -= mainUnitsToMove
	if err := tx.Save(&main).Error; err != nil {
		return 0, err
	}
	return movedToProduction, nil
}

func convertRawQuantityBetweenUnits(quantity float64, rawID uint, fromUnitID uint, toUnitID uint) (float64, error) {
	if fromUnitID == toUnitID {
		return quantity, nil
	}
	conversion, err := findRawConversion(rawID, fromUnitID, toUnitID)
	if err == nil {
		return quantity * conversion.Coefficient, nil
	}
	reverse, reverseErr := findRawConversion(rawID, toUnitID, fromUnitID)
	if reverseErr != nil || reverse.Coefficient == 0 {
		return 0, err
	}
	return quantity / reverse.Coefficient, nil
}

func CancelProductionPlan(c *gin.Context) {
	id := c.Param("id")
	var plan models.ProductionPlan
	if err := database.DB.Preload("FinishedProduct").First(&plan, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "План не найден"})
		return
	}
	if plan.Status == models.ProductionPlanCompleted {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Завершенный план нельзя отменить"})
		return
	}
	if plan.Status == models.ProductionPlanCanceled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "План уже отменен"})
		return
	}
	plan.Status = models.ProductionPlanCanceled
	if err := database.DB.Save(&plan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось отменить план"})
		return
	}
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Отмена производственного плана", fmt.Sprintf("План #%s, продукция %s", id, plan.FinishedProduct.Name))
	c.JSON(http.StatusOK, plan)
}
