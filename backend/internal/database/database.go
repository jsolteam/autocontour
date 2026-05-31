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
	err := DB.AutoMigrate(
		&models.Permission{},
		&models.Role{},
		&models.User{},
		&models.UnitOfMeasure{},
		&models.UnitConversion{},
		&models.Nomenclature{},
		&models.FinishedProduct{},
		&models.AuditLog{},
	)
	if err != nil {
		log.Fatalf("Ошибка миграции: %v", err)
	}
	log.Println("✅ Миграции применены")

	seed()
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

	// Права доступа
	permissions := []models.Permission{
		{Method: "GET", Path: "/api/v1/nomenclature"},
		{Method: "POST", Path: "/api/v1/nomenclature"},
		{Method: "PUT", Path: "/api/v1/nomenclature"},
		{Method: "DELETE", Path: "/api/v1/nomenclature"},
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
		{Method: "GET", Path: "/api/v1/audit"},
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