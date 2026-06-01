package database

import (
	"fmt"
	"log"

	"github.com/jsolteam/autocontour/internal/config"
	"github.com/jsolteam/autocontour/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable TimeZone=Europe/Moscow",
		config.App.DBHost,
		config.App.DBPort,
		config.App.DBUser,
		config.App.DBPassword,
		config.App.DBName,
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Ошибка подключения к БД: %v", err)
	}

	log.Println("✅ Подключение к PostgreSQL успешно")
}

func Migrate() {
	cleanupLegacyNomenclature()

	err := DB.AutoMigrate(
		&models.Permission{},
		&models.Role{},
		&models.User{},
		&models.UnitOfMeasure{},
		&models.RawMaterialCategory{},
		&models.ProductionMaterialCategory{},
		&models.RawMaterial{},
		&models.ProductionMaterial{},
		&models.UnitConversion{},
		&models.MainStockRaw{},
		&models.MainStockMaterial{},
		&models.FinishedProduct{},
		&models.Recipe{},
		&models.RecipeRawMaterial{},
		&models.RecipeProductionMaterial{},
		&models.MainStockFinished{},
		&models.ProductionStockRaw{},
		&models.ProductionStockMaterial{},
		&models.ProductionStockFinished{},
		&models.StockInvoice{},
		&models.StockInvoiceItem{},
		&models.ProductionPlan{},
		&models.AuditLog{},
		&models.AppSetting{},
	)
	if err != nil {
		log.Fatalf("Ошибка миграции: %v", err)
	}
	log.Println("✅ Миграции применены")

	seed()
}

func cleanupLegacyNomenclature() {
	DB.Exec("ALTER TABLE unit_conversions DROP CONSTRAINT IF EXISTS fk_unit_conversions_nomenclature")
	DB.Exec("ALTER TABLE unit_conversions DROP COLUMN IF EXISTS nomenclature_id")
	DB.Exec("ALTER TABLE conversion_rates DROP CONSTRAINT IF EXISTS fk_unit_conversions_nomenclature")
	DB.Exec("ALTER TABLE conversion_rates DROP COLUMN IF EXISTS nomenclature_id")
	DB.Exec("DROP TABLE IF EXISTS nomenclatures")
}

func seedCategories() {
	rawCategories := []models.RawMaterialCategory{
		{Name: "ПАВ"},
		{Name: "Кислоты"},
		{Name: "Отдушки"},
		{Name: "Вода"},
		{Name: "Прочее сырьё"},
	}
	for _, cat := range rawCategories {
		DB.Where("name = ?", cat.Name).FirstOrCreate(&cat)
	}

	materialCategories := []models.ProductionMaterialCategory{
		{Name: "Флаконы", SupportsCapacity: true},
		{Name: "Канистры пустые", SupportsCapacity: true},
		{Name: "Коробки", SupportsCapacity: true},
		{Name: "Паллеты", SupportsCapacity: true},
		{Name: "Крышки", SupportsCapacity: false},
		{Name: "Этикетки", SupportsCapacity: false},
		{Name: "Прочие материалы", SupportsCapacity: false},
	}
	for _, cat := range materialCategories {
		DB.Where("name = ?", cat.Name).FirstOrCreate(&cat)
	}
}

func seed() {
	// Базовые единицы измерения
	units := []models.UnitOfMeasure{
		{Name: "шт"},
		{Name: "кг"},
		{Name: "л"},
		{Name: "паллета"},
		{Name: "бочка"},
		{Name: "г"},
		{Name: "мл"},
	}
	for _, u := range units {
		DB.Where("name = ?", u.Name).FirstOrCreate(&u)
	}

	seedCategories()

	// Права доступа
	permissions := []models.Permission{
		{Method: "GET", Path: "/api/v1/raw-material-categories"},
		{Method: "POST", Path: "/api/v1/raw-material-categories"},
		{Method: "PUT", Path: "/api/v1/raw-material-categories"},
		{Method: "DELETE", Path: "/api/v1/raw-material-categories"},
		{Method: "GET", Path: "/api/v1/material-categories"},
		{Method: "POST", Path: "/api/v1/material-categories"},
		{Method: "PUT", Path: "/api/v1/material-categories"},
		{Method: "DELETE", Path: "/api/v1/material-categories"},
		{Method: "GET", Path: "/api/v1/raw-materials"},
		{Method: "POST", Path: "/api/v1/raw-materials"},
		{Method: "PUT", Path: "/api/v1/raw-materials"},
		{Method: "DELETE", Path: "/api/v1/raw-materials"},
		{Method: "GET", Path: "/api/v1/materials"},
		{Method: "POST", Path: "/api/v1/materials"},
		{Method: "PUT", Path: "/api/v1/materials"},
		{Method: "DELETE", Path: "/api/v1/materials"},
		{Method: "GET", Path: "/api/v1/main-stock/raw"},
		{Method: "POST", Path: "/api/v1/main-stock/raw"},
		{Method: "GET", Path: "/api/v1/main-stock/materials"},
		{Method: "POST", Path: "/api/v1/main-stock/materials"},
		{Method: "GET", Path: "/api/v1/recipes"},
		{Method: "POST", Path: "/api/v1/recipes"},
		{Method: "PUT", Path: "/api/v1/recipes"},
		{Method: "DELETE", Path: "/api/v1/recipes"},
		{Method: "GET", Path: "/api/v1/finished-products"},
		{Method: "POST", Path: "/api/v1/finished-products"},
		{Method: "PUT", Path: "/api/v1/finished-products"},
		{Method: "DELETE", Path: "/api/v1/finished-products"},
		{Method: "GET", Path: "/api/v1/units"},
		{Method: "POST", Path: "/api/v1/units"},
		{Method: "PUT", Path: "/api/v1/units"},
		{Method: "DELETE", Path: "/api/v1/units"},
		{Method: "GET", Path: "/api/v1/conversions"},
		{Method: "POST", Path: "/api/v1/conversions"},
		{Method: "PUT", Path: "/api/v1/conversions"},
		{Method: "DELETE", Path: "/api/v1/conversions"},
		{Method: "GET", Path: "/api/v1/users"},
		{Method: "POST", Path: "/api/v1/users"},
		{Method: "PUT", Path: "/api/v1/users"},
		{Method: "DELETE", Path: "/api/v1/users"},
		{Method: "GET", Path: "/api/v1/roles"},
		{Method: "POST", Path: "/api/v1/roles"},
		{Method: "PUT", Path: "/api/v1/roles"},
		{Method: "DELETE", Path: "/api/v1/roles"},
		{Method: "GET", Path: "/api/v1/permissions"},
		{Method: "GET", Path: "/api/v1/production-stock/raw"},
		{Method: "GET", Path: "/api/v1/production-stock/materials"},
		{Method: "GET", Path: "/api/v1/production-stock/finished"},
		{Method: "GET", Path: "/api/v1/main-stock/finished"},
		{Method: "POST", Path: "/api/v1/invoices/raw-receipts"},
		{Method: "POST", Path: "/api/v1/invoices/material-receipts"},
		{Method: "GET", Path: "/api/v1/invoices"},
		{Method: "POST", Path: "/api/v1/invoices"},
		{Method: "POST", Path: "/api/v1/invoices/:id/confirm"},
		{Method: "GET", Path: "/api/v1/reports/balances"},
		{Method: "GET", Path: "/api/v1/reports/receipts"},
		{Method: "GET", Path: "/api/v1/production/plans"},
		{Method: "POST", Path: "/api/v1/production/initialize-plan"},
		{Method: "POST", Path: "/api/v1/production/plans/:id/complete"},
		{Method: "POST", Path: "/api/v1/production/pack-pallets"},
		{Method: "GET", Path: "/api/v1/audit"},
		{Method: "GET", Path: "/api/v1/settings"},
		{Method: "PUT", Path: "/api/v1/settings"},
		{Method: "POST", Path: "/api/v1/invoices/:id/cancel"},
		{Method: "POST", Path: "/api/v1/production/plans/:id/cancel"},
	}
	var createdPerms []models.Permission
	for _, p := range permissions {
		var perm models.Permission
		DB.Where("method = ? AND path = ?", p.Method, p.Path).FirstOrCreate(&perm, p)
		createdPerms = append(createdPerms, perm)
	}

	// Роль Администратора — все права
	var adminRole models.Role
	DB.Where("name = ?", "Администратор").FirstOrCreate(&adminRole, models.Role{Name: "Администратор"})
	DB.Model(&adminRole).Association("Permissions").Replace(createdPerms)

	// Роль Кладовщика
	var warehouseRole models.Role
	DB.Where("name = ?", "Кладовщик").FirstOrCreate(&warehouseRole, models.Role{Name: "Кладовщик"})

	// Роль Технолога
	var techRole models.Role
	DB.Where("name = ?", "Технолог").FirstOrCreate(&techRole, models.Role{Name: "Технолог"})

	// Суперпользователь admin
	var adminUser models.User
	if err := DB.Where("login = ?", "admin").First(&adminUser).Error; err != nil {
		hashed, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		adminUser = models.User{
			Login:    "admin",
			Password: string(hashed),
			FullName: "Администратор системы",
			RoleID:   adminRole.ID,
		}
		DB.Create(&adminUser)
		log.Println("✅ Пользователь admin создан (пароль: admin123)")
	}
}
