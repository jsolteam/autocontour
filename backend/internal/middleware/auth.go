package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jsolteam/autocontour/internal/config"
	"github.com/jsolteam/autocontour/internal/database"
	"github.com/jsolteam/autocontour/internal/models"
)

type Claims struct {
	UserID uint   `json:"user_id"`
	Login  string `json:"login"`
	RoleID uint   `json:"role_id"`
	jwt.RegisteredClaims
}

// AuthMiddleware validates JWT from Authorization header.
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Требуется авторизация"})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Неверный формат токена"})
			return
		}

		token, err := jwt.ParseWithClaims(parts[1], &Claims{}, func(t *jwt.Token) (interface{}, error) {
			return []byte(config.App.JWTSecret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Недействительный токен"})
			return
		}

		claims, ok := token.Claims.(*Claims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Ошибка токена"})
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("login", claims.Login)
		c.Set("roleID", claims.RoleID)
		c.Next()
	}
}

// RBACMiddleware checks whether the user's role has permission for the requested method+path.
func RBACMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		roleID, exists := c.Get("roleID")
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Нет прав доступа"})
			return
		}

		var role models.Role
		if err := database.DB.Preload("Permissions").First(&role, roleID).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Роль не найдена"})
			return
		}

		method := c.Request.Method
		// Normalize path — strip query string and match base path
		path := c.FullPath()

		for _, perm := range role.Permissions {
			if perm.Method == method && matchPath(perm.Path, path) {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "У вашей роли нет доступа к этому разделу"})
	}
}

// matchPath supports wildcard suffix: /api/v1/nomenclature matches /api/v1/nomenclature/:id
func matchPath(permPath, requestPath string) bool {
	if permPath == requestPath {
		return true
	}
	if strings.HasPrefix(requestPath, permPath+"/") || strings.HasPrefix(requestPath, permPath+"/:") {
		return true
	}
	// strip dynamic segment from request path
	parts := strings.Split(requestPath, "/")
	if len(parts) > 0 {
		base := strings.Join(parts[:len(parts)-1], "/")
		if base == permPath {
			return true
		}
	}
	return false
}