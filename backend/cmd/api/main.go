package main

import (
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jsolteam/autocontour/internal/config"
	"github.com/jsolteam/autocontour/internal/database"
	"github.com/jsolteam/autocontour/internal/handlers"
	"github.com/jsolteam/autocontour/internal/middleware"
)

func main() {
	config.Load()
	database.Connect()
	database.Migrate()

	r := gin.Default()

	// CORS — allow frontend (React dev server or same-origin in prod)
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
	}))

	// ─── Public routes ────────────────────────────
	r.GET("/ping", handlers.Ping)
	r.POST("/api/v1/auth/login", handlers.Login)

	// ─── Protected routes ─────────────────────────
	api := r.Group("/api/v1")
	api.Use(middleware.AuthMiddleware())
	api.Use(middleware.RBACMiddleware())

	// Units of Measure
	api.GET("/units", handlers.ListUnits)
	api.POST("/units", handlers.CreateUnit)
	api.PUT("/units/:id", handlers.UpdateUnit)
	api.DELETE("/units/:id", handlers.DeleteUnit)

	// Unit Conversions
	api.GET("/conversions", handlers.ListConversions)
	api.POST("/conversions", handlers.CreateConversion)
	api.PUT("/conversions/:id", handlers.UpdateConversion)
	api.DELETE("/conversions/:id", handlers.DeleteConversion)

	// Nomenclature
	api.GET("/nomenclature", handlers.ListNomenclature)
	api.GET("/nomenclature/:id", handlers.GetNomenclature)
	api.POST("/nomenclature", handlers.CreateNomenclature)
	api.PUT("/nomenclature/:id", handlers.UpdateNomenclature)
	api.DELETE("/nomenclature/:id", handlers.DeleteNomenclature)

	// Finished Products
	api.GET("/finished-products", handlers.ListFinishedProducts)
	api.GET("/finished-products/:id", handlers.GetFinishedProduct)
	api.POST("/finished-products", handlers.CreateFinishedProduct)
	api.PUT("/finished-products/:id", handlers.UpdateFinishedProduct)
	api.DELETE("/finished-products/:id", handlers.DeleteFinishedProduct)

	// Users & Roles (Admin only via RBAC)
	api.GET("/users", handlers.ListUsers)
	api.POST("/users", handlers.CreateUser)
	api.PUT("/users/:id", handlers.UpdateUser)
	api.DELETE("/users/:id", handlers.DeleteUser)

	api.GET("/roles", handlers.ListRoles)
	api.POST("/roles", handlers.CreateRole)
	api.PUT("/roles/:id", handlers.UpdateRole)
	api.DELETE("/roles/:id", handlers.DeleteRole)

	api.GET("/permissions", handlers.ListPermissions)

	// Audit logs
	api.GET("/audit", handlers.ListAuditLogs)

	log.Printf("🚀 Авто-Контур запущен на порту %s", config.App.ServerPort)
	if err := r.Run(":" + config.App.ServerPort); err != nil {
		log.Fatalf("Ошибка запуска сервера: %v", err)
	}
}