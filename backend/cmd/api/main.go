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

	// Isolated raw material and production material catalogs
	api.GET("/raw-material-categories", handlers.ListRawMaterialCategories)
	api.POST("/raw-material-categories", handlers.CreateRawMaterialCategory)
	api.PUT("/raw-material-categories/:id", handlers.UpdateRawMaterialCategory)
	api.DELETE("/raw-material-categories/:id", handlers.DeleteRawMaterialCategory)

	api.GET("/material-categories", handlers.ListProductionMaterialCategories)
	api.POST("/material-categories", handlers.CreateProductionMaterialCategory)
	api.PUT("/material-categories/:id", handlers.UpdateProductionMaterialCategory)
	api.DELETE("/material-categories/:id", handlers.DeleteProductionMaterialCategory)

	api.GET("/raw-materials", handlers.ListRawMaterials)
	api.GET("/raw-materials/:id", handlers.GetRawMaterial)
	api.POST("/raw-materials", handlers.CreateRawMaterial)
	api.PUT("/raw-materials/:id", handlers.UpdateRawMaterial)
	api.DELETE("/raw-materials/:id", handlers.DeleteRawMaterial)

	api.GET("/materials", handlers.ListProductionMaterials)
	api.GET("/materials/:id", handlers.GetProductionMaterial)
	api.POST("/materials", handlers.CreateProductionMaterial)
	api.PUT("/materials/:id", handlers.UpdateProductionMaterial)
	api.DELETE("/materials/:id", handlers.DeleteProductionMaterial)

	api.GET("/main-stock/raw", handlers.ListMainStockRaw)
	api.POST("/main-stock/raw", handlers.UpsertMainStockRaw)
	api.GET("/main-stock/materials", handlers.ListMainStockMaterials)
	api.POST("/main-stock/materials", handlers.UpsertMainStockMaterial)
	api.GET("/main-stock/finished", handlers.ListMainStockFinished)
	api.GET("/production-stock/raw", handlers.ListProductionStockRaw)
	api.GET("/production-stock/materials", handlers.ListProductionStockMaterials)
	api.GET("/production-stock/finished", handlers.ListProductionStockFinished)
	api.POST("/invoices/raw-receipts", handlers.CreateRawReceiptInvoice)
	api.POST("/invoices/material-receipts", handlers.CreateMaterialReceiptInvoice)
	api.GET("/invoices", handlers.ListInvoices)
	api.POST("/invoices", handlers.CreateStockInvoice)
	api.POST("/invoices/:id/confirm", handlers.ConfirmStockInvoice)
	api.POST("/invoices/:id/cancel", handlers.CancelStockInvoice)
	api.GET("/reports/balances", handlers.BalanceReport)
	api.GET("/reports/receipts", handlers.ReceiptsReport)
	api.GET("/production/plans", handlers.ListProductionPlans)
	api.POST("/production/initialize-plan", handlers.InitializeProductionPlan)
	api.POST("/production/plans/:id/complete", handlers.CompleteProductionPlan)
	api.POST("/production/plans/:id/cancel", handlers.CancelProductionPlan)
	api.POST("/production/pack-pallets", handlers.PackFinishedToPallets)

	// Finished Products
	api.GET("/finished-products", handlers.ListFinishedProducts)
	api.GET("/finished-products/:id", handlers.GetFinishedProduct)
	api.POST("/finished-products", handlers.CreateFinishedProduct)
	api.PUT("/finished-products/:id", handlers.UpdateFinishedProduct)
	api.DELETE("/finished-products/:id", handlers.DeleteFinishedProduct)

	// Recipes
	api.GET("/recipes", handlers.ListRecipes)
	api.GET("/recipes/:id", handlers.GetRecipe)
	api.POST("/recipes", handlers.CreateRecipe)
	api.PUT("/recipes/:id", handlers.UpdateRecipe)
	api.DELETE("/recipes/:id", handlers.DeleteRecipe)

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
	api.GET("/settings", handlers.GetSettings)
	api.PUT("/settings", handlers.UpdateSettings)

	log.Printf("🚀 Авто-Контур запущен на порту %s", config.App.ServerPort)
	if err := r.Run(":" + config.App.ServerPort); err != nil {
		log.Fatalf("Ошибка запуска сервера: %v", err)
	}
}
