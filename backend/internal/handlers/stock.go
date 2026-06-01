package handlers

import (
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jsolteam/autocontour/internal/database"
	"github.com/jsolteam/autocontour/internal/models"
	"github.com/jsolteam/autocontour/internal/services"
	"gorm.io/gorm"
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

func ListMainStockFinished(c *gin.Context) {
	var items []models.MainStockFinished
	database.DB.Preload("FinishedProduct.BaseUnit").Order("finished_product_id").Find(&items)
	c.JSON(http.StatusOK, items)
}

func ListProductionStockRaw(c *gin.Context) {
	var items []models.ProductionStockRaw
	database.DB.Preload("RawMaterial.Category").Preload("RawMaterial.BaseUnit").Preload("Unit").Order("raw_material_id").Find(&items)
	c.JSON(http.StatusOK, items)
}

func ListProductionStockMaterials(c *gin.Context) {
	var items []models.ProductionStockMaterial
	database.DB.Preload("ProductionMaterial.Category").Preload("ProductionMaterial.BaseUnit").Preload("ProductionMaterial.CapacityUnit").Order("production_material_id").Find(&items)
	c.JSON(http.StatusOK, items)
}

func ListProductionStockFinished(c *gin.Context) {
	var items []models.ProductionStockFinished
	database.DB.Preload("FinishedProduct.BaseUnit").Order("finished_product_id").Find(&items)
	c.JSON(http.StatusOK, items)
}

type invoiceInput struct {
	Number      string             `json:"number" binding:"required"`
	Type        models.InvoiceType `json:"type"`
	EffectiveAt *time.Time         `json:"effective_at"`
	Items       []struct {
		ItemType string  `json:"item_type" binding:"required"`
		ItemID   uint    `json:"item_id" binding:"required"`
		Quantity float64 `json:"quantity" binding:"required"`
	} `json:"items" binding:"required"`
}

func CreateRawReceiptInvoice(c *gin.Context) {
	createReceiptInvoice(c, models.InvoiceTypeRawReceipt)
}

func CreateMaterialReceiptInvoice(c *gin.Context) {
	createReceiptInvoice(c, models.InvoiceTypeMaterialReceipt)
}

func CreateStockInvoice(c *gin.Context) {
	var input invoiceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.Type == "" {
		input.Type = models.InvoiceTypeMixedReceipt
	}
	createInvoice(c, input.Type, input)
}

func createReceiptInvoice(c *gin.Context, typ models.InvoiceType) {
	var input invoiceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	createInvoice(c, typ, input)
}

func createInvoice(c *gin.Context, typ models.InvoiceType, input invoiceInput) {
	if len(input.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Добавьте хотя бы одну строку накладной"})
		return
	}
	effectiveAt := time.Now()
	if input.EffectiveAt != nil {
		effectiveAt = *input.EffectiveAt
	}
	var invoice models.StockInvoice
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		invoice = models.StockInvoice{Number: input.Number, Type: typ, Status: models.StockInvoicePending, EffectiveAt: effectiveAt}
		if err := tx.Create(&invoice).Error; err != nil {
			return err
		}
		for _, line := range input.Items {
			if line.Quantity <= 0 {
				return fmt.Errorf("количество в накладной должно быть положительным")
			}
			item := models.StockInvoiceItem{InvoiceID: invoice.ID, Quantity: line.Quantity}
			switch line.ItemType {
			case "raw":
				if typ != models.InvoiceTypeRawReceipt && typ != models.InvoiceTypeMixedReceipt && typ != models.InvoiceTypeRawIssue {
					return fmt.Errorf("сырьё нельзя добавить в выбранный тип накладной")
				}
				if err := tx.First(&models.RawMaterial{}, line.ItemID).Error; err != nil {
					return fmt.Errorf("сырьё ID=%d не найдено", line.ItemID)
				}
				item.RawMaterialID = &line.ItemID
			case "material":
				if typ != models.InvoiceTypeMaterialReceipt && typ != models.InvoiceTypeMixedReceipt && typ != models.InvoiceTypeMaterialIssue {
					return fmt.Errorf("материал нельзя добавить в выбранный тип накладной")
				}
				if err := tx.First(&models.ProductionMaterial{}, line.ItemID).Error; err != nil {
					return fmt.Errorf("материал ID=%d не найден", line.ItemID)
				}
				item.ProductionMaterialID = &line.ItemID
			case "finished":
				if typ != models.InvoiceTypeFinishedShipment {
					return fmt.Errorf("ГП можно использовать только в накладной отгрузки")
				}
				if !isWholeQuantity(line.Quantity) {
					return fmt.Errorf("отгрузка ГП указывается целыми паллетами")
				}
				if err := tx.First(&models.FinishedProduct{}, line.ItemID).Error; err != nil {
					return fmt.Errorf("ГП ID=%d не найдена", line.ItemID)
				}
				item.FinishedProductID = &line.ItemID
			default:
				return fmt.Errorf("тип строки должен быть raw, material или finished")
			}
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Создание операции на подтверждение", fmt.Sprintf("Накладная %s, тип=%s", input.Number, typ))
	c.JSON(http.StatusCreated, invoice)
}

func ConfirmStockInvoice(c *gin.Context) {
	id := c.Param("id")
	var invoice models.StockInvoice
	if err := database.DB.Preload("Items").First(&invoice, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Накладная не найдена"})
		return
	}
	if invoice.Status == models.StockInvoiceConfirmed {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Накладная уже подтверждена"})
		return
	}
	if invoice.Status == models.StockInvoiceCanceled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Отмененную накладную нельзя подтвердить"})
		return
	}
	now := time.Now()
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		for _, item := range invoice.Items {
			if item.RawMaterialID != nil {
				var stock models.MainStockRaw
				tx.Where("raw_material_id = ?", *item.RawMaterialID).FirstOrInit(&stock)
				stock.RawMaterialID = *item.RawMaterialID
				if invoice.Type == models.InvoiceTypeRawIssue {
					if stock.CurrentStock < item.Quantity {
						return fmt.Errorf("недостаточно сырья ID=%d", *item.RawMaterialID)
					}
					stock.CurrentStock -= item.Quantity
				} else {
					stock.CurrentStock += item.Quantity
				}
				if err := tx.Save(&stock).Error; err != nil {
					return err
				}
			}
			if item.ProductionMaterialID != nil {
				var stock models.MainStockMaterial
				tx.Where("production_material_id = ?", *item.ProductionMaterialID).FirstOrInit(&stock)
				stock.ProductionMaterialID = *item.ProductionMaterialID
				if invoice.Type == models.InvoiceTypeMaterialIssue {
					if stock.CurrentStock < item.Quantity {
						return fmt.Errorf("недостаточно материала ID=%d", *item.ProductionMaterialID)
					}
					stock.CurrentStock -= item.Quantity
				} else {
					stock.CurrentStock += item.Quantity
				}
				if err := tx.Save(&stock).Error; err != nil {
					return err
				}
			}
			if item.FinishedProductID != nil {
				if !isWholeQuantity(item.Quantity) {
					return fmt.Errorf("отгрузка ГП указывается целыми паллетами")
				}
				var stock models.MainStockFinished
				tx.Where("finished_product_id = ?", *item.FinishedProductID).FirstOrInit(&stock)
				stock.FinishedProductID = *item.FinishedProductID
				if stock.CurrentStockPallets < item.Quantity {
					return fmt.Errorf("недостаточно паллет ГП ID=%d", *item.FinishedProductID)
				}
				var fp models.FinishedProduct
				if err := tx.First(&fp, *item.FinishedProductID).Error; err != nil {
					return err
				}
				stock.CurrentStockPallets -= item.Quantity
				stock.CurrentStockUnits -= item.Quantity * float64(fp.PalletCapacity)
				if err := tx.Save(&stock).Error; err != nil {
					return err
				}
			}
		}
		invoice.Status = models.StockInvoiceConfirmed
		invoice.ConfirmedAt = &now
		return tx.Save(&invoice).Error
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Подтверждение складской операции", fmt.Sprintf("Накладная %s", invoice.Number))
	c.JSON(http.StatusOK, invoice)
}

type stockTransferInput struct {
	ItemType  string  `json:"item_type" binding:"required"`
	ItemID    uint    `json:"item_id" binding:"required"`
	Direction string  `json:"direction" binding:"required"`
	Quantity  float64 `json:"quantity" binding:"required"`
	UnitID    *uint   `json:"unit_id"`
}

func ManualStockTransfer(c *gin.Context) {
	var input stockTransferInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.Quantity <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Количество должно быть положительным"})
		return
	}
	if input.Direction != "main_to_production" && input.Direction != "production_to_main" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Направление должно быть main_to_production или production_to_main"})
		return
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		switch input.ItemType {
		case "raw":
			return transferRawStock(tx, input)
		case "material":
			return transferMaterialStock(tx, input)
		case "finished":
			return transferFinishedStock(tx, input)
		default:
			return fmt.Errorf("тип позиции должен быть raw, material или finished")
		}
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Ручное перемещение между складами", fmt.Sprintf("%s ID=%d, направление=%s, количество=%.4g", input.ItemType, input.ItemID, input.Direction, input.Quantity))
	c.JSON(http.StatusOK, gin.H{"message": "Перемещение выполнено"})
}

func transferRawStock(tx *gorm.DB, input stockTransferInput) error {
	var raw models.RawMaterial
	if err := tx.First(&raw, input.ItemID).Error; err != nil {
		return fmt.Errorf("сырьё ID=%d не найдено", input.ItemID)
	}
	productionUnitID := raw.BaseUnitID
	if input.UnitID != nil {
		productionUnitID = *input.UnitID
	}
	var prod models.ProductionStockRaw
	tx.Where("raw_material_id = ?", raw.ID).FirstOrInit(&prod)
	if input.Direction == "main_to_production" {
		productionStock, err := productionRawStockInUnit(prod, raw, productionUnitID)
		if err != nil {
			return fmt.Errorf("нет коэффициента перевода производственного остатка сырья %s", raw.Name)
		}
		movedToProduction, err := moveWholeRawPackages(tx, raw, productionUnitID, input.Quantity)
		if err != nil {
			return err
		}
		prod.RawMaterialID = raw.ID
		prod.UnitID = &productionUnitID
		prod.CurrentStock = productionStock + movedToProduction
		return tx.Save(&prod).Error
	}
	stockUnitID := raw.BaseUnitID
	if prod.UnitID != nil {
		stockUnitID = *prod.UnitID
	}
	if prod.CurrentStock+0.0001 < input.Quantity {
		return fmt.Errorf("недостаточно сырья %s на складе производства", raw.Name)
	}
	returnedToMain, err := convertRawQuantityBetweenUnits(input.Quantity, raw.ID, stockUnitID, raw.BaseUnitID)
	if err != nil {
		return fmt.Errorf("нет коэффициента перевода сырья %s в складскую ЕИ", raw.Name)
	}
	prod.CurrentStock -= input.Quantity
	if err := tx.Save(&prod).Error; err != nil {
		return err
	}
	var main models.MainStockRaw
	tx.Where("raw_material_id = ?", raw.ID).FirstOrInit(&main)
	main.RawMaterialID = raw.ID
	main.CurrentStock += returnedToMain
	return tx.Save(&main).Error
}

func transferMaterialStock(tx *gorm.DB, input stockTransferInput) error {
	var material models.ProductionMaterial
	if err := tx.First(&material, input.ItemID).Error; err != nil {
		return fmt.Errorf("материал ID=%d не найден", input.ItemID)
	}
	var main models.MainStockMaterial
	tx.Where("production_material_id = ?", material.ID).FirstOrInit(&main)
	main.ProductionMaterialID = material.ID
	var prod models.ProductionStockMaterial
	tx.Where("production_material_id = ?", material.ID).FirstOrInit(&prod)
	prod.ProductionMaterialID = material.ID
	if input.Direction == "main_to_production" {
		if main.CurrentStock+0.0001 < input.Quantity {
			return fmt.Errorf("недостаточно материала %s на основном складе", material.Name)
		}
		main.CurrentStock -= input.Quantity
		prod.CurrentStock += input.Quantity
	} else {
		if prod.CurrentStock+0.0001 < input.Quantity {
			return fmt.Errorf("недостаточно материала %s на складе производства", material.Name)
		}
		prod.CurrentStock -= input.Quantity
		main.CurrentStock += input.Quantity
	}
	if err := tx.Save(&main).Error; err != nil {
		return err
	}
	return tx.Save(&prod).Error
}

func transferFinishedStock(tx *gorm.DB, input stockTransferInput) error {
	if !isWholeQuantity(input.Quantity) {
		return fmt.Errorf("готовая продукция перемещается целыми паллетами")
	}
	var fp models.FinishedProduct
	if err := tx.First(&fp, input.ItemID).Error; err != nil {
		return fmt.Errorf("ГП ID=%d не найдена", input.ItemID)
	}
	units := input.Quantity * float64(fp.PalletCapacity)
	var main models.MainStockFinished
	tx.Where("finished_product_id = ?", fp.ID).FirstOrInit(&main)
	main.FinishedProductID = fp.ID
	var prod models.ProductionStockFinished
	tx.Where("finished_product_id = ?", fp.ID).FirstOrInit(&prod)
	prod.FinishedProductID = fp.ID
	if input.Direction == "production_to_main" {
		if prod.CurrentStockUnits+0.0001 < units {
			return fmt.Errorf("недостаточно ГП %s на складе производства", fp.Name)
		}
		prod.CurrentStockUnits -= units
		main.CurrentStockUnits += units
		main.CurrentStockPallets += input.Quantity
	} else {
		if main.CurrentStockPallets+0.0001 < input.Quantity || main.CurrentStockUnits+0.0001 < units {
			return fmt.Errorf("недостаточно паллет ГП %s на основном складе", fp.Name)
		}
		main.CurrentStockPallets -= input.Quantity
		main.CurrentStockUnits -= units
		prod.CurrentStockUnits += units
	}
	if err := tx.Save(&main).Error; err != nil {
		return err
	}
	return tx.Save(&prod).Error
}

func CancelStockInvoice(c *gin.Context) {
	id := c.Param("id")
	var invoice models.StockInvoice
	if err := database.DB.First(&invoice, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Накладная не найдена"})
		return
	}
	if invoice.Status == models.StockInvoiceConfirmed {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Подтвержденную накладную нельзя отменить"})
		return
	}
	if invoice.Status == models.StockInvoiceCanceled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Накладная уже отменена"})
		return
	}
	invoice.Status = models.StockInvoiceCanceled
	if err := database.DB.Save(&invoice).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось отменить накладную"})
		return
	}
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Отмена складской операции", fmt.Sprintf("Накладная %s", invoice.Number))
	c.JSON(http.StatusOK, invoice)
}

func ListInvoices(c *gin.Context) {
	var items []models.StockInvoice
	q := database.DB.Preload("Items.RawMaterial.BaseUnit").Preload("Items.RawMaterial.Category").Preload("Items.ProductionMaterial.BaseUnit").Preload("Items.ProductionMaterial.Category").Preload("Items.FinishedProduct.BaseUnit").Order("created_at DESC")
	if typ := c.Query("type"); typ != "" {
		q = q.Where("type = ?", typ)
	}
	if status := c.Query("status"); status != "" {
		q = q.Where("status = ?", status)
	}
	q.Find(&items)
	c.JSON(http.StatusOK, items)
}

func BalanceReport(c *gin.Context) {
	type row struct {
		Name            string  `json:"name"`
		Type            string  `json:"type"`
		Category        string  `json:"category"`
		MainStock       float64 `json:"main_stock"`
		ProductionStock float64 `json:"production_stock"`
		Total           float64 `json:"total"`
		Unit            string  `json:"unit"`
		TotalPallets    float64 `json:"total_pallets"`
		MainPallets     float64 `json:"main_pallets"`
	}
	rows := []row{}
	database.DB.Raw(`
		SELECT rm.name, 'raw' AS type, COALESCE(rc.name,'—') category, COALESCE(ms.current_stock,0) main_stock, COALESCE(ps.current_stock,0) production_stock,
		COALESCE(ms.current_stock,0)+COALESCE(ps.current_stock,0) total, u.name unit, 0 total_pallets, 0 main_pallets
		FROM raw_materials rm JOIN unit_of_measures u ON u.id=rm.base_unit_id
		LEFT JOIN raw_material_categories rc ON rc.id=rm.category_id
		LEFT JOIN main_stock_raws ms ON ms.raw_material_id=rm.id
		LEFT JOIN production_stock_raws ps ON ps.raw_material_id=rm.id
		UNION ALL
		SELECT pm.name, 'material', COALESCE(pc.name,'—'), COALESCE(ms.current_stock,0), COALESCE(ps.current_stock,0), COALESCE(ms.current_stock,0)+COALESCE(ps.current_stock,0), u.name, 0, 0
		FROM production_materials pm JOIN unit_of_measures u ON u.id=pm.base_unit_id
		LEFT JOIN production_material_categories pc ON pc.id=pm.category_id
		LEFT JOIN main_stock_materials ms ON ms.production_material_id=pm.id
		LEFT JOIN production_stock_materials ps ON ps.production_material_id=pm.id
		UNION ALL
		SELECT fp.name, 'finished', 'Готовая продукция', COALESCE(ms.current_stock_units,0), COALESCE(ps.current_stock_units,0), COALESCE(ms.current_stock_units,0)+COALESCE(ps.current_stock_units,0), u.name, COALESCE(ms.current_stock_pallets,0), COALESCE(ms.current_stock_pallets,0)
		FROM finished_products fp JOIN unit_of_measures u ON u.id=fp.base_unit_id
		LEFT JOIN main_stock_finisheds ms ON ms.finished_product_id=fp.id
		LEFT JOIN production_stock_finisheds ps ON ps.finished_product_id=fp.id
	`).Scan(&rows)
	c.JSON(http.StatusOK, rows)
}

func ReceiptsReport(c *gin.Context) {
	ListInvoices(c)
}

func isWholeQuantity(quantity float64) bool {
	return math.Abs(quantity-math.Round(quantity)) <= 0.0001
}
