package models

import (
	"time"
)

// ─────────────────────────────────────────────
//  Auth & RBAC
// ─────────────────────────────────────────────

type Permission struct {
	ID     uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Method string `gorm:"not null" json:"method"` // GET, POST, PUT, DELETE
	Path   string `gorm:"not null" json:"path"`   // e.g. /api/v1/recipes
}

type Role struct {
	ID          uint         `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string       `gorm:"uniqueIndex;not null" json:"name"`
	Permissions []Permission `gorm:"many2many:role_permissions;" json:"permissions,omitempty"`
}

type User struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Login     string    `gorm:"uniqueIndex;not null" json:"login"`
	Password  string    `gorm:"not null" json:"-"`
	FullName  string    `json:"full_name"`
	RoleID    uint      `gorm:"not null" json:"role_id"`
	Role      Role      `gorm:"foreignKey:RoleID" json:"role,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// ─────────────────────────────────────────────
//  Справочники
// ─────────────────────────────────────────────

type UnitOfMeasure struct {
	ID   uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Name string `gorm:"uniqueIndex;not null" json:"name"` // шт, кг, л, паллета, бочка
}

type NomenclatureType string

const (
	NomenclatureTypeRaw      NomenclatureType = "raw"
	NomenclatureTypeMaterial NomenclatureType = "material"
)

func (UnitConversion) TableName() string { return "conversion_rates" }

type UnitConversion struct {
	ID               uint                `gorm:"primaryKey;autoIncrement" json:"id"`
	NomenclatureType NomenclatureType    `gorm:"type:varchar(16);not null;default:'raw';index" json:"nomenclature_type"`
	ItemID           *uint               `gorm:"index" json:"item_id"` // null = универсальный для типа номенклатуры
	RawMaterial      *RawMaterial        `gorm:"-" json:"raw_material,omitempty"`
	Material         *ProductionMaterial `gorm:"-" json:"material,omitempty"`
	FromUnitID       uint                `json:"from_unit_id"`
	FromUnit         UnitOfMeasure       `gorm:"foreignKey:FromUnitID" json:"from_unit,omitempty"`
	ToUnitID         uint                `json:"to_unit_id"`
	ToUnit           UnitOfMeasure       `gorm:"foreignKey:ToUnitID" json:"to_unit,omitempty"`
	Coefficient      float64             `gorm:"not null" json:"coefficient"`
}

type RawMaterialCategory struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Name      string    `gorm:"uniqueIndex;not null" json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type ProductionMaterialCategory struct {
	ID               uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Name             string    `gorm:"uniqueIndex;not null" json:"name"`
	SupportsCapacity bool      `gorm:"not null;default:false" json:"supports_capacity"`
	CreatedAt        time.Time `json:"created_at"`
}

type RawMaterial struct {
	ID         uint                `gorm:"primaryKey;autoIncrement" json:"id"`
	Name       string              `gorm:"not null;index" json:"name"`
	CategoryID uint                `json:"category_id"`
	Category   RawMaterialCategory `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	BaseUnitID uint                `json:"base_unit_id"`
	BaseUnit   UnitOfMeasure       `gorm:"foreignKey:BaseUnitID" json:"base_unit,omitempty"`
	CreatedAt  time.Time           `json:"created_at"`
}

type ProductionMaterial struct {
	ID             uint                       `gorm:"primaryKey;autoIncrement" json:"id"`
	Name           string                     `gorm:"not null;index" json:"name"`
	CategoryID     uint                       `json:"category_id"`
	Category       ProductionMaterialCategory `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	BaseUnitID     uint                       `json:"base_unit_id"`
	BaseUnit       UnitOfMeasure              `gorm:"foreignKey:BaseUnitID" json:"base_unit,omitempty"`
	CapacityValue  *float64                   `json:"capacity_value"`
	CapacityUnitID *uint                      `json:"capacity_unit_id"`
	CapacityUnit   *UnitOfMeasure             `gorm:"foreignKey:CapacityUnitID" json:"capacity_unit,omitempty"`
	CreatedAt      time.Time                  `json:"created_at"`
}

type FinishedProduct struct {
	ID             uint          `gorm:"primaryKey;autoIncrement" json:"id"`
	Name           string        `gorm:"not null" json:"name"`
	BaseUnitID     uint          `json:"base_unit_id"` // всегда шт
	BaseUnit       UnitOfMeasure `gorm:"foreignKey:BaseUnitID" json:"base_unit,omitempty"`
	PalletCapacity int           `gorm:"not null;default:1" json:"pallet_capacity"` // шт в 1 паллете
	CreatedAt      time.Time     `json:"created_at"`
}

// ─────────────────────────────────────────────
//  Рецептуры
// ─────────────────────────────────────────────

type Recipe struct {
	ID                uint                       `gorm:"primaryKey;autoIncrement" json:"id"`
	FinishedProductID uint                       `gorm:"not null;index" json:"finished_product_id"`
	FinishedProduct   FinishedProduct            `gorm:"foreignKey:FinishedProductID" json:"finished_product,omitempty"`
	Name              string                     `gorm:"not null" json:"name"`
	OutputQuantity    float64                    `gorm:"not null" json:"output_quantity"`
	OutputUnitID      *uint                      `json:"output_unit_id"`
	OutputUnit        *UnitOfMeasure             `gorm:"foreignKey:OutputUnitID" json:"output_unit,omitempty"`
	RawItems          []RecipeRawMaterial        `gorm:"foreignKey:RecipeID;constraint:OnDelete:CASCADE" json:"raw_items"`
	MaterialItems     []RecipeProductionMaterial `gorm:"foreignKey:RecipeID;constraint:OnDelete:CASCADE" json:"material_items"`
	CreatedAt         time.Time                  `json:"created_at"`
	UpdatedAt         time.Time                  `json:"updated_at"`
}

type RecipeRawMaterial struct {
	ID            uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	RecipeID      uint           `gorm:"not null;index" json:"recipe_id"`
	RawMaterialID uint           `gorm:"not null;index" json:"raw_material_id"`
	RawMaterial   RawMaterial    `gorm:"foreignKey:RawMaterialID" json:"raw_material,omitempty"`
	Quantity      float64        `gorm:"not null" json:"quantity"`
	UnitID        *uint          `json:"unit_id"`
	Unit          *UnitOfMeasure `gorm:"foreignKey:UnitID" json:"unit,omitempty"`
}

type RecipeProductionMaterial struct {
	ID                   uint               `gorm:"primaryKey;autoIncrement" json:"id"`
	RecipeID             uint               `gorm:"not null;index" json:"recipe_id"`
	ProductionMaterialID uint               `gorm:"not null;index" json:"production_material_id"`
	ProductionMaterial   ProductionMaterial `gorm:"foreignKey:ProductionMaterialID" json:"production_material,omitempty"`
	Quantity             float64            `gorm:"not null" json:"quantity"`
}

// ─────────────────────────────────────────────
//  Главные складские таблицы основного склада
// ─────────────────────────────────────────────

type MainStockRaw struct {
	ID            uint        `gorm:"primaryKey;autoIncrement" json:"id"`
	RawMaterialID uint        `gorm:"uniqueIndex;not null" json:"raw_material_id"`
	RawMaterial   RawMaterial `gorm:"foreignKey:RawMaterialID" json:"raw_material,omitempty"`
	CurrentStock  float64     `gorm:"not null;default:0" json:"current_stock"`
	UpdatedAt     time.Time   `json:"updated_at"`
}

type MainStockMaterial struct {
	ID                   uint               `gorm:"primaryKey;autoIncrement" json:"id"`
	ProductionMaterialID uint               `gorm:"uniqueIndex;not null" json:"production_material_id"`
	ProductionMaterial   ProductionMaterial `gorm:"foreignKey:ProductionMaterialID" json:"production_material,omitempty"`
	CurrentStock         float64            `gorm:"not null;default:0" json:"current_stock"`
	UpdatedAt            time.Time          `json:"updated_at"`
}

// ─────────────────────────────────────────────
//  Audit log
// ─────────────────────────────────────────────

type AuditLog struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint      `json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Action    string    `json:"action"`
	Details   string    `gorm:"type:text" json:"details"`
	CreatedAt time.Time `json:"created_at"`
}

// ─────────────────────────────────────────────
//  Производственный склад и планы
// ─────────────────────────────────────────────

type MainStockFinished struct {
	ID                  uint            `gorm:"primaryKey;autoIncrement" json:"id"`
	FinishedProductID   uint            `gorm:"uniqueIndex;not null" json:"finished_product_id"`
	FinishedProduct     FinishedProduct `gorm:"foreignKey:FinishedProductID" json:"finished_product,omitempty"`
	CurrentStockUnits   float64         `gorm:"not null;default:0" json:"current_stock_units"`
	CurrentStockPallets float64         `gorm:"not null;default:0" json:"current_stock_pallets"`
	UpdatedAt           time.Time       `json:"updated_at"`
}

type ProductionStockRaw struct {
	ID            uint        `gorm:"primaryKey;autoIncrement" json:"id"`
	RawMaterialID uint        `gorm:"uniqueIndex;not null" json:"raw_material_id"`
	RawMaterial   RawMaterial `gorm:"foreignKey:RawMaterialID" json:"raw_material,omitempty"`
	CurrentStock  float64     `gorm:"not null;default:0" json:"current_stock"`
	UpdatedAt     time.Time   `json:"updated_at"`
}

type ProductionStockMaterial struct {
	ID                   uint               `gorm:"primaryKey;autoIncrement" json:"id"`
	ProductionMaterialID uint               `gorm:"uniqueIndex;not null" json:"production_material_id"`
	ProductionMaterial   ProductionMaterial `gorm:"foreignKey:ProductionMaterialID" json:"production_material,omitempty"`
	CurrentStock         float64            `gorm:"not null;default:0" json:"current_stock"`
	UpdatedAt            time.Time          `json:"updated_at"`
}

type ProductionStockFinished struct {
	ID                uint            `gorm:"primaryKey;autoIncrement" json:"id"`
	FinishedProductID uint            `gorm:"uniqueIndex;not null" json:"finished_product_id"`
	FinishedProduct   FinishedProduct `gorm:"foreignKey:FinishedProductID" json:"finished_product,omitempty"`
	CurrentStockUnits float64         `gorm:"not null;default:0" json:"current_stock_units"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

type InvoiceType string

const (
	InvoiceTypeRawReceipt       InvoiceType = "raw_receipt"
	InvoiceTypeMaterialReceipt  InvoiceType = "material_receipt"
	InvoiceTypeMixedReceipt     InvoiceType = "mixed_receipt"
	InvoiceTypeRawIssue         InvoiceType = "raw_issue"
	InvoiceTypeMaterialIssue    InvoiceType = "material_issue"
	InvoiceTypeFinishedShipment InvoiceType = "finished_shipment"
)

type StockInvoiceStatus string

const (
	StockInvoicePending   StockInvoiceStatus = "PENDING"
	StockInvoiceConfirmed StockInvoiceStatus = "CONFIRMED"
)

type StockInvoice struct {
	ID          uint               `gorm:"primaryKey;autoIncrement" json:"id"`
	Number      string             `gorm:"not null;index" json:"number"`
	Type        InvoiceType        `gorm:"type:varchar(32);not null;index" json:"type"`
	Status      StockInvoiceStatus `gorm:"type:varchar(24);not null;default:'PENDING';index" json:"status"`
	EffectiveAt time.Time          `json:"effective_at"`
	ConfirmedAt *time.Time         `json:"confirmed_at"`
	CreatedAt   time.Time          `json:"created_at"`
	Items       []StockInvoiceItem `gorm:"foreignKey:InvoiceID;constraint:OnDelete:CASCADE" json:"items,omitempty"`
}

type StockInvoiceItem struct {
	ID                   uint                `gorm:"primaryKey;autoIncrement" json:"id"`
	InvoiceID            uint                `gorm:"not null;index" json:"invoice_id"`
	RawMaterialID        *uint               `gorm:"index" json:"raw_material_id"`
	RawMaterial          *RawMaterial        `gorm:"foreignKey:RawMaterialID" json:"raw_material,omitempty"`
	ProductionMaterialID *uint               `gorm:"index" json:"production_material_id"`
	ProductionMaterial   *ProductionMaterial `gorm:"foreignKey:ProductionMaterialID" json:"production_material,omitempty"`
	FinishedProductID    *uint               `gorm:"index" json:"finished_product_id"`
	FinishedProduct      *FinishedProduct    `gorm:"foreignKey:FinishedProductID" json:"finished_product,omitempty"`
	Quantity             float64             `gorm:"not null" json:"quantity"`
}

type ProductionPlanStatus string

const (
	ProductionPlanInProgress ProductionPlanStatus = "IN_PROGRESS"
	ProductionPlanCompleted  ProductionPlanStatus = "COMPLETED"
)

type ProductionPlan struct {
	ID                uint                 `gorm:"primaryKey;autoIncrement" json:"id"`
	RecipeID          uint                 `gorm:"not null;index" json:"recipe_id"`
	Recipe            Recipe               `gorm:"foreignKey:RecipeID" json:"recipe,omitempty"`
	FinishedProductID uint                 `gorm:"not null;index" json:"finished_product_id"`
	FinishedProduct   FinishedProduct      `gorm:"foreignKey:FinishedProductID" json:"finished_product,omitempty"`
	TargetQuantity    float64              `gorm:"not null" json:"target_quantity"`
	Status            ProductionPlanStatus `gorm:"type:varchar(24);not null;index" json:"status"`
	CreatedAt         time.Time            `json:"created_at"`
}
