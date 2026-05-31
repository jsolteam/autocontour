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

type UnitConversion struct {
	ID              uint          `gorm:"primaryKey;autoIncrement" json:"id"`
	NomenclatureID  *uint         `json:"nomenclature_id"` // null = универсальный
	Nomenclature    *Nomenclature `gorm:"foreignKey:NomenclatureID" json:"nomenclature,omitempty"`
	FromUnitID      uint          `json:"from_unit_id"`
	FromUnit        UnitOfMeasure `gorm:"foreignKey:FromUnitID" json:"from_unit,omitempty"`
	ToUnitID        uint          `json:"to_unit_id"`
	ToUnit          UnitOfMeasure `gorm:"foreignKey:ToUnitID" json:"to_unit,omitempty"`
	Coefficient     float64       `gorm:"not null" json:"coefficient"`
}

type Nomenclature struct {
	ID          uint          `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string        `gorm:"not null" json:"name"`
	Category    string        `gorm:"not null" json:"category"` // Крышки, Бутылки, Этикетки, Хим. реактивы…
	BaseUnitID  uint          `json:"base_unit_id"`
	BaseUnit    UnitOfMeasure `gorm:"foreignKey:BaseUnitID" json:"base_unit,omitempty"`
	CreatedAt   time.Time     `json:"created_at"`
}

type FinishedProduct struct {
	ID              uint          `gorm:"primaryKey;autoIncrement" json:"id"`
	Name            string        `gorm:"not null" json:"name"`
	BaseUnitID      uint          `json:"base_unit_id"` // всегда шт
	BaseUnit        UnitOfMeasure `gorm:"foreignKey:BaseUnitID" json:"base_unit,omitempty"`
	PalletCapacity  int           `gorm:"not null;default:1" json:"pallet_capacity"` // шт в 1 паллете
	CreatedAt       time.Time     `json:"created_at"`
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