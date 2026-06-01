package handlers

import (
	"fmt"
	"math"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jsolteam/autocontour/internal/database"
	"github.com/jsolteam/autocontour/internal/models"
	"github.com/jsolteam/autocontour/internal/services"
	"gorm.io/gorm"
)

type recipeRawInput struct {
	RawMaterialID uint    `json:"raw_material_id" binding:"required"`
	Quantity      float64 `json:"quantity" binding:"required"`
	UnitID        *uint   `json:"unit_id"`
}

type recipeMaterialInput struct {
	ProductionMaterialID uint    `json:"production_material_id" binding:"required"`
	Quantity             float64 `json:"quantity" binding:"required"`
}

type recipeInput struct {
	FinishedProductID uint                  `json:"finished_product_id" binding:"required"`
	Name              string                `json:"name" binding:"required"`
	OutputQuantity    float64               `json:"output_quantity" binding:"required"`
	OutputUnitID      *uint                 `json:"output_unit_id"`
	RawItems          []recipeRawInput      `json:"raw_items" binding:"required"`
	MaterialItems     []recipeMaterialInput `json:"material_items" binding:"required"`
}

func ListRecipes(c *gin.Context) {
	var items []models.Recipe
	q := recipePreloads(database.DB)
	if search := c.Query("search"); search != "" {
		q = q.Where("name ILIKE ?", "%"+search+"%")
	}
	q.Order("created_at DESC").Find(&items)
	c.JSON(http.StatusOK, items)
}

func GetRecipe(c *gin.Context) {
	id := c.Param("id")
	var item models.Recipe
	if err := recipePreloads(database.DB).First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Рецепт не найден"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func CreateRecipe(c *gin.Context) {
	var input recipeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validateRecipeInput(input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var recipe models.Recipe
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		recipe = models.Recipe{
			FinishedProductID: input.FinishedProductID,
			Name:              strings.TrimSpace(input.Name),
			OutputQuantity:    input.OutputQuantity,
			OutputUnitID:      input.OutputUnitID,
		}
		if err := tx.Create(&recipe).Error; err != nil {
			return err
		}
		return replaceRecipeLines(tx, recipe.ID, input)
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	recipePreloads(database.DB).First(&recipe, recipe.ID)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Создание рецепта", fmt.Sprintf("Создан рецепт ID=%d: %s", recipe.ID, recipe.Name))
	c.JSON(http.StatusCreated, recipe)
}

func UpdateRecipe(c *gin.Context) {
	id := c.Param("id")
	var input recipeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validateRecipeInput(input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var recipe models.Recipe
	if err := database.DB.First(&recipe, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Рецепт не найден"})
		return
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		recipe.FinishedProductID = input.FinishedProductID
		recipe.Name = strings.TrimSpace(input.Name)
		recipe.OutputQuantity = input.OutputQuantity
		recipe.OutputUnitID = input.OutputUnitID
		if err := tx.Save(&recipe).Error; err != nil {
			return err
		}
		return replaceRecipeLines(tx, recipe.ID, input)
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	recipePreloads(database.DB).First(&recipe, recipe.ID)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Изменение рецепта", fmt.Sprintf("Обновлен рецепт ID=%s: %s", id, recipe.Name))
	c.JSON(http.StatusOK, recipe)
}

func DeleteRecipe(c *gin.Context) {
	id := c.Param("id")
	var recipe models.Recipe
	if err := database.DB.First(&recipe, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Рецепт не найден"})
		return
	}
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("recipe_id = ?", recipe.ID).Delete(&models.RecipeRawMaterial{}).Error; err != nil {
			return err
		}
		if err := tx.Where("recipe_id = ?", recipe.ID).Delete(&models.RecipeProductionMaterial{}).Error; err != nil {
			return err
		}
		return tx.Delete(&recipe).Error
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Удаление рецепта", fmt.Sprintf("Удален рецепт ID=%s", id))
	c.JSON(http.StatusOK, gin.H{"message": "Рецепт удален"})
}

func recipePreloads(db *gorm.DB) *gorm.DB {
	return db.
		Preload("FinishedProduct.BaseUnit").
		Preload("OutputUnit").
		Preload("RawItems.RawMaterial.Category").
		Preload("RawItems.RawMaterial.BaseUnit").
		Preload("RawItems.Unit").
		Preload("MaterialItems.ProductionMaterial.Category").
		Preload("MaterialItems.ProductionMaterial.BaseUnit").
		Preload("MaterialItems.ProductionMaterial.CapacityUnit")
}

func validateRecipeInput(input recipeInput) error {
	if strings.TrimSpace(input.Name) == "" {
		return fmt.Errorf("название рецепта обязательно")
	}
	if input.OutputQuantity <= 0 {
		return fmt.Errorf("выход продукции должен быть положительным")
	}
	if len(input.RawItems) == 0 {
		return fmt.Errorf("добавьте хотя бы одну позицию сырья")
	}
	if len(input.MaterialItems) == 0 {
		return fmt.Errorf("добавьте хотя бы один материал")
	}

	var finishedCount int64
	database.DB.Model(&models.FinishedProduct{}).Where("id = ?", input.FinishedProductID).Count(&finishedCount)
	if finishedCount == 0 {
		return fmt.Errorf("готовая продукция не найдена")
	}

	literRawTotal := 0.0
	for _, raw := range input.RawItems {
		if raw.Quantity <= 0 {
			return fmt.Errorf("количество сырья должно быть положительным")
		}
		var material models.RawMaterial
		if err := database.DB.Preload("BaseUnit").First(&material, raw.RawMaterialID).Error; err != nil {
			return fmt.Errorf("сырьё ID=%d не найдено", raw.RawMaterialID)
		}
		lineUnitID := material.BaseUnitID
		if raw.UnitID != nil {
			lineUnitID = *raw.UnitID
		}
		if lineUnitID != material.BaseUnitID {
			if _, err := findRawConversion(material.ID, lineUnitID, material.BaseUnitID); err != nil {
				return fmt.Errorf("для сырья %s нет коэффициента перевода из выбранной ЕИ в базовую ЕИ", material.Name)
			}
		}
		liters, err := convertRawQuantity(raw.Quantity, material.ID, lineUnitID, "л")
		if err == nil {
			literRawTotal += liters
		} else if isLiterUnit(material.BaseUnit.Name) {
			literRawTotal += raw.Quantity
		}
	}

	for _, materialLine := range input.MaterialItems {
		if materialLine.Quantity <= 0 {
			return fmt.Errorf("количество материала должно быть положительным")
		}
		var material models.ProductionMaterial
		if err := database.DB.Preload("CapacityUnit").First(&material, materialLine.ProductionMaterialID).Error; err != nil {
			return fmt.Errorf("материал ID=%d не найден", materialLine.ProductionMaterialID)
		}
		if material.CapacityValue != nil && material.CapacityUnit != nil && isLiterUnit(material.CapacityUnit.Name) {
			volumePerUnit := literRawTotal / input.OutputQuantity
			if !floatEqual(volumePerUnit, *material.CapacityValue) {
				return fmt.Errorf("вместимость тары не совпадает: жидкого сырья %.4g л / выход %.4g шт = %.4g л на шт, а материал \"%s\" вмещает %.4g л", literRawTotal, input.OutputQuantity, volumePerUnit, material.Name, *material.CapacityValue)
			}
		}
	}
	return nil
}

func replaceRecipeLines(tx *gorm.DB, recipeID uint, input recipeInput) error {
	if err := tx.Where("recipe_id = ?", recipeID).Delete(&models.RecipeRawMaterial{}).Error; err != nil {
		return err
	}
	if err := tx.Where("recipe_id = ?", recipeID).Delete(&models.RecipeProductionMaterial{}).Error; err != nil {
		return err
	}

	rawItems := make([]models.RecipeRawMaterial, 0, len(input.RawItems))
	for _, raw := range input.RawItems {
		rawItems = append(rawItems, models.RecipeRawMaterial{
			RecipeID:      recipeID,
			RawMaterialID: raw.RawMaterialID,
			Quantity:      raw.Quantity,
			UnitID:        raw.UnitID,
		})
	}
	if err := tx.Create(&rawItems).Error; err != nil {
		return err
	}

	materialItems := make([]models.RecipeProductionMaterial, 0, len(input.MaterialItems))
	for _, material := range input.MaterialItems {
		materialItems = append(materialItems, models.RecipeProductionMaterial{
			RecipeID:             recipeID,
			ProductionMaterialID: material.ProductionMaterialID,
			Quantity:             material.Quantity,
		})
	}
	return tx.Create(&materialItems).Error
}

func findRawConversion(rawID uint, fromUnitID uint, toUnitID uint) (models.UnitConversion, error) {
	var conversion models.UnitConversion
	err := database.DB.Where("nomenclature_type = ? AND from_unit_id = ? AND to_unit_id = ? AND (item_id = ? OR item_id IS NULL)", models.NomenclatureTypeRaw, fromUnitID, toUnitID, rawID).
		Order("item_id IS NULL").First(&conversion).Error
	return conversion, err
}

func convertRawQuantity(quantity float64, rawID uint, fromUnitID uint, toUnitName string) (float64, error) {
	var toUnit models.UnitOfMeasure
	if err := database.DB.Where("LOWER(name) IN ?", []string{strings.ToLower(toUnitName), "литр", "литры", "l"}).First(&toUnit).Error; err != nil {
		return 0, err
	}
	if fromUnitID == toUnit.ID {
		return quantity, nil
	}
	conversion, err := findRawConversion(rawID, fromUnitID, toUnit.ID)
	if err != nil {
		return 0, err
	}
	return quantity * conversion.Coefficient, nil
}

func isLiterUnit(name string) bool {
	normalized := strings.ToLower(strings.TrimSpace(name))
	return normalized == "л" || normalized == "литр" || normalized == "литры" || normalized == "l"
}

func floatEqual(left, right float64) bool {
	return math.Abs(left-right) <= 0.0001
}
