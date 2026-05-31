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
	database.DB.Order("name").Find(&units)
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
	if err := c.ShouldBindJSON(&unit); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
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
	q := database.DB.Preload("FromUnit").Preload("ToUnit")
	if typ := c.Query("nomenclature_type"); typ != "" {
		q = q.Where("nomenclature_type = ?", typ)
	}
	q.Find(&items)
	hydrateConversions(items)
	c.JSON(http.StatusOK, items)
}

func CreateConversion(c *gin.Context) {
	var item models.UnitConversion
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validateConversion(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Create(&item)
	database.DB.Preload("FromUnit").Preload("ToUnit").First(&item, item.ID)
	items := []models.UnitConversion{item}
	hydrateConversions(items)
	item = items[0]
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
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validateConversion(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Save(&item)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Изменение конвертации", fmt.Sprintf("Конвертация ID=%s обновлена", id))
	database.DB.Preload("FromUnit").Preload("ToUnit").First(&item, item.ID)
	items := []models.UnitConversion{item}
	hydrateConversions(items)
	item = items[0]
	c.JSON(http.StatusOK, item)
}

func DeleteConversion(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.UnitConversion{}, id)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Удаление конвертации", fmt.Sprintf("Конвертация ID=%s удалена", id))
	c.JSON(http.StatusOK, gin.H{"message": "Конвертация удалена"})
}

func validateConversion(item *models.UnitConversion) error {
	if item.Coefficient <= 0 {
		return fmt.Errorf("коэффициент должен быть положительным")
	}
	if item.NomenclatureType != models.NomenclatureTypeRaw && item.NomenclatureType != models.NomenclatureTypeMaterial {
		return fmt.Errorf("тип номенклатуры должен быть raw или material")
	}
	if item.ItemID != nil {
		var count int64
		if item.NomenclatureType == models.NomenclatureTypeRaw {
			database.DB.Model(&models.RawMaterial{}).Where("id = ?", *item.ItemID).Count(&count)
		} else {
			database.DB.Model(&models.ProductionMaterial{}).Where("id = ?", *item.ItemID).Count(&count)
		}
		if count == 0 {
			return fmt.Errorf("объект выбранного типа не найден")
		}
	}
	return nil
}

func hydrateConversions(items []models.UnitConversion) {
	for i := range items {
		if items[i].ItemID == nil {
			continue
		}
		if items[i].NomenclatureType == models.NomenclatureTypeRaw {
			var raw models.RawMaterial
			if err := database.DB.Preload("Category").Preload("BaseUnit").First(&raw, *items[i].ItemID).Error; err == nil {
				items[i].RawMaterial = &raw
			}
		} else {
			var material models.ProductionMaterial
			if err := database.DB.Preload("Category").Preload("BaseUnit").Preload("CapacityUnit").First(&material, *items[i].ItemID).Error; err == nil {
				items[i].Material = &material
			}
		}
	}
}

// ─── Categories ─────────────────────────────────

func ListRawMaterialCategories(c *gin.Context) {
	var items []models.RawMaterialCategory
	database.DB.Order("name").Find(&items)
	c.JSON(http.StatusOK, items)
}

func CreateRawMaterialCategory(c *gin.Context) {
	var item models.RawMaterialCategory
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := database.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Категория сырья уже существует"})
		return
	}
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Создание категории сырья", fmt.Sprintf("Добавлена категория сырья: %s", item.Name))
	c.JSON(http.StatusCreated, item)
}

func UpdateRawMaterialCategory(c *gin.Context) {
	id := c.Param("id")
	var item models.RawMaterialCategory
	if err := database.DB.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Категория сырья не найдена"})
		return
	}
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Save(&item)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Изменение категории сырья", fmt.Sprintf("Категория сырья ID=%s изменена", id))
	c.JSON(http.StatusOK, item)
}

func DeleteRawMaterialCategory(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.RawMaterialCategory{}, id)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Удаление категории сырья", fmt.Sprintf("Категория сырья ID=%s удалена", id))
	c.JSON(http.StatusOK, gin.H{"message": "Категория сырья удалена"})
}

func ListProductionMaterialCategories(c *gin.Context) {
	var items []models.ProductionMaterialCategory
	database.DB.Order("name").Find(&items)
	c.JSON(http.StatusOK, items)
}

func CreateProductionMaterialCategory(c *gin.Context) {
	var item models.ProductionMaterialCategory
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := database.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Категория материалов уже существует"})
		return
	}
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Создание категории материалов", fmt.Sprintf("Добавлена категория материалов: %s", item.Name))
	c.JSON(http.StatusCreated, item)
}

func UpdateProductionMaterialCategory(c *gin.Context) {
	id := c.Param("id")
	var item models.ProductionMaterialCategory
	if err := database.DB.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Категория материалов не найдена"})
		return
	}
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Save(&item)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Изменение категории материалов", fmt.Sprintf("Категория материалов ID=%s изменена", id))
	c.JSON(http.StatusOK, item)
}

func DeleteProductionMaterialCategory(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.ProductionMaterialCategory{}, id)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Удаление категории материалов", fmt.Sprintf("Категория материалов ID=%s удалена", id))
	c.JSON(http.StatusOK, gin.H{"message": "Категория материалов удалена"})
}

// ─── Raw Materials ───────────────────────────────

func ListRawMaterials(c *gin.Context) {
	var items []models.RawMaterial
	q := database.DB.Preload("Category").Preload("BaseUnit")
	if search := c.Query("search"); search != "" {
		q = q.Where("name ILIKE ?", "%"+search+"%")
	}
	if categoryID := c.Query("category_id"); categoryID != "" {
		q = q.Where("category_id = ?", categoryID)
	}
	q.Order("name").Find(&items)
	c.JSON(http.StatusOK, items)
}

func GetRawMaterial(c *gin.Context) {
	id := c.Param("id")
	var item models.RawMaterial
	if err := database.DB.Preload("Category").Preload("BaseUnit").First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Сырьё не найдено"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func CreateRawMaterial(c *gin.Context) {
	var item models.RawMaterial
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if item.Name == "" || item.CategoryID == 0 || item.BaseUnitID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Название, категория и базовая ЕИ обязательны"})
		return
	}
	database.DB.Create(&item)
	database.DB.Preload("Category").Preload("BaseUnit").First(&item, item.ID)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Создание сырья", fmt.Sprintf("Добавлено сырьё: %s", item.Name))
	c.JSON(http.StatusCreated, item)
}

func UpdateRawMaterial(c *gin.Context) {
	id := c.Param("id")
	var item models.RawMaterial
	if err := database.DB.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Сырьё не найдено"})
		return
	}
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Save(&item)
	database.DB.Preload("Category").Preload("BaseUnit").First(&item, item.ID)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Изменение сырья", fmt.Sprintf("Обновлено сырьё ID=%s: %s", id, item.Name))
	c.JSON(http.StatusOK, item)
}

func DeleteRawMaterial(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.RawMaterial{}, id)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Удаление сырья", fmt.Sprintf("Удалено сырьё ID=%s", id))
	c.JSON(http.StatusOK, gin.H{"message": "Сырьё удалено"})
}

// ─── Production Materials ────────────────────────

func ListProductionMaterials(c *gin.Context) {
	var items []models.ProductionMaterial
	q := database.DB.Preload("Category").Preload("BaseUnit").Preload("CapacityUnit")
	if search := c.Query("search"); search != "" {
		q = q.Where("name ILIKE ?", "%"+search+"%")
	}
	if categoryID := c.Query("category_id"); categoryID != "" {
		q = q.Where("category_id = ?", categoryID)
	}
	q.Order("name").Find(&items)
	c.JSON(http.StatusOK, items)
}

func GetProductionMaterial(c *gin.Context) {
	id := c.Param("id")
	var item models.ProductionMaterial
	if err := database.DB.Preload("Category").Preload("BaseUnit").Preload("CapacityUnit").First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Материал не найден"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func CreateProductionMaterial(c *gin.Context) {
	var item models.ProductionMaterial
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validateProductionMaterial(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Create(&item)
	database.DB.Preload("Category").Preload("BaseUnit").Preload("CapacityUnit").First(&item, item.ID)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Создание материала", fmt.Sprintf("Добавлен материал: %s", item.Name))
	c.JSON(http.StatusCreated, item)
}

func UpdateProductionMaterial(c *gin.Context) {
	id := c.Param("id")
	var item models.ProductionMaterial
	if err := database.DB.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Материал не найден"})
		return
	}
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validateProductionMaterial(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Save(&item)
	database.DB.Preload("Category").Preload("BaseUnit").Preload("CapacityUnit").First(&item, item.ID)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Изменение материала", fmt.Sprintf("Обновлен материал ID=%s: %s", id, item.Name))
	c.JSON(http.StatusOK, item)
}

func DeleteProductionMaterial(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.ProductionMaterial{}, id)
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Удаление материала", fmt.Sprintf("Удален материал ID=%s", id))
	c.JSON(http.StatusOK, gin.H{"message": "Материал удален"})
}

func validateProductionMaterial(item *models.ProductionMaterial) error {
	if item.Name == "" || item.CategoryID == 0 || item.BaseUnitID == 0 {
		return fmt.Errorf("название, категория и базовая ЕИ обязательны")
	}
	if item.CapacityValue == nil && item.CapacityUnitID != nil || item.CapacityValue != nil && item.CapacityUnitID == nil {
		return fmt.Errorf("вместимость должна содержать значение и ЕИ одновременно")
	}
	if item.CapacityValue != nil && *item.CapacityValue <= 0 {
		return fmt.Errorf("значение вместимости должно быть положительным")
	}
	return nil
}

// ─── Finished Products ───────────────────────────

func ListFinishedProducts(c *gin.Context) {
	var items []models.FinishedProduct
	q := database.DB.Preload("BaseUnit")
	if search := c.Query("search"); search != "" {
		q = q.Where("name ILIKE ?", "%"+search+"%")
	}
	q.Order("name").Find(&items)
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
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
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
