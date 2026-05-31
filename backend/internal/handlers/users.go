package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jsolteam/autocontour/internal/database"
	"github.com/jsolteam/autocontour/internal/models"
	"github.com/jsolteam/autocontour/internal/services"
	"golang.org/x/crypto/bcrypt"
)

// ─── Users ───────────────────────────────────────

func ListUsers(c *gin.Context) {
	var users []models.User
	database.DB.Preload("Role").Find(&users)
	c.JSON(http.StatusOK, users)
}

func CreateUser(c *gin.Context) {
	var input struct {
		Login    string `json:"login" binding:"required"`
		Password string `json:"password" binding:"required"`
		FullName string `json:"full_name"`
		RoleID   uint   `json:"role_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка хеширования пароля"})
		return
	}

	user := models.User{
		Login:    input.Login,
		Password: string(hashed),
		FullName: input.FullName,
		RoleID:   input.RoleID,
	}
	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Логин уже занят"})
		return
	}

	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Создание пользователя", fmt.Sprintf("Создан пользователь: %s", user.Login))

	database.DB.Preload("Role").First(&user, user.ID)
	c.JSON(http.StatusCreated, user)
}

func UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}

	var input struct {
		FullName string `json:"full_name"`
		RoleID   uint   `json:"role_id"`
		Password string `json:"password"`
	}
	c.ShouldBindJSON(&input)

	if input.FullName != "" {
		user.FullName = input.FullName
	}
	if input.RoleID != 0 {
		user.RoleID = input.RoleID
	}
	if input.Password != "" {
		hashed, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
		user.Password = string(hashed)
	}

	database.DB.Save(&user)

	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Изменение пользователя", fmt.Sprintf("Обновлён пользователь ID=%s", id))

	database.DB.Preload("Role").First(&user, user.ID)
	c.JSON(http.StatusOK, user)
}

func DeleteUser(c *gin.Context) {
	id := c.Param("id")
	actorID, _ := c.Get("userID")

	// Cannot delete yourself
	if fmt.Sprintf("%v", actorID) == id {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Нельзя удалить собственный аккаунт"})
		return
	}

	if err := database.DB.Delete(&models.User{}, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}
	services.LogAction(actorID.(uint), "Удаление пользователя", fmt.Sprintf("Удалён пользователь ID=%s", id))
	c.JSON(http.StatusOK, gin.H{"message": "Пользователь удалён"})
}

// ─── Roles ───────────────────────────────────────

func ListRoles(c *gin.Context) {
	var roles []models.Role
	database.DB.Preload("Permissions").Find(&roles)
	c.JSON(http.StatusOK, roles)
}

func CreateRole(c *gin.Context) {
	var input struct {
		Name          string `json:"name" binding:"required"`
		PermissionIDs []uint `json:"permission_ids"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	role := models.Role{Name: input.Name}
	if err := database.DB.Create(&role).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Роль с таким именем уже существует"})
		return
	}

	if len(input.PermissionIDs) > 0 {
		var perms []models.Permission
		database.DB.Find(&perms, input.PermissionIDs)
		database.DB.Model(&role).Association("Permissions").Replace(perms)
	}

	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Создание роли", fmt.Sprintf("Создана роль: %s", role.Name))

	database.DB.Preload("Permissions").First(&role, role.ID)
	c.JSON(http.StatusCreated, role)
}

func UpdateRole(c *gin.Context) {
	id := c.Param("id")
	var role models.Role
	if err := database.DB.Preload("Permissions").First(&role, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Роль не найдена"})
		return
	}

	var input struct {
		Name          string `json:"name"`
		PermissionIDs []uint `json:"permission_ids"`
	}
	c.ShouldBindJSON(&input)

	if input.Name != "" {
		role.Name = input.Name
	}
	database.DB.Save(&role)

	if input.PermissionIDs != nil {
		var perms []models.Permission
		database.DB.Find(&perms, input.PermissionIDs)
		database.DB.Model(&role).Association("Permissions").Replace(perms)
	}

	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Изменение роли", fmt.Sprintf("Обновлена роль ID=%s", id))

	database.DB.Preload("Permissions").First(&role, role.ID)
	c.JSON(http.StatusOK, role)
}

func DeleteRole(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Role{}, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Роль не найдена"})
		return
	}
	actorID, _ := c.Get("userID")
	services.LogAction(actorID.(uint), "Удаление роли", fmt.Sprintf("Удалена роль ID=%s", id))
	c.JSON(http.StatusOK, gin.H{"message": "Роль удалена"})
}

// ─── Permissions ───────────────────────────────────────

func ListPermissions(c *gin.Context) {
	var perms []models.Permission
	database.DB.Find(&perms)
	c.JSON(http.StatusOK, perms)
}