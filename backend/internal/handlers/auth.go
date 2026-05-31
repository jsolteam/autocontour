package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jsolteam/autocontour/internal/config"
	"github.com/jsolteam/autocontour/internal/database"
	"github.com/jsolteam/autocontour/internal/middleware"
	"github.com/jsolteam/autocontour/internal/models"
	"golang.org/x/crypto/bcrypt"
)

type loginInput struct {
	Login    string `json:"login" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Login(c *gin.Context) {
	var input loginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Введите логин и пароль"})
		return
	}

	var user models.User
	if err := database.DB.Preload("Role").Where("login = ?", input.Login).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверный логин или пароль"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверный логин или пароль"})
		return
	}

	claims := &middleware.Claims{
		UserID: user.ID,
		Login:  user.Login,
		RoleID: user.RoleID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(config.App.JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка генерации токена"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": signed,
		"user": gin.H{
			"id":        user.ID,
			"login":     user.Login,
			"full_name": user.FullName,
			"role":      user.Role.Name,
			"role_id":   user.RoleID,
		},
	})
}

// Ping — health check for frontend server discovery
func Ping(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"system":  "Авто-Контур",
		"version": "1.0.0",
		"team":    "JSOL Team",
	})
}