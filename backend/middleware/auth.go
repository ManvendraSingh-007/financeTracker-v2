package middleware

import (
	"net/http"
	"strings"

	"finance-backend/utility"

	"github.com/gofiber/fiber/v3"
)

func RequireAuth(c fiber.Ctx) error {
	token := strings.TrimSpace(c.Cookies("jwt"))

	if token == "" {
		authHeader := strings.TrimSpace(c.Get("Authorization"))
		if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
			token = strings.TrimSpace(authHeader[7:])
		}
	}

	if token == "" {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	claims, err := utility.ParseJWT(token)
	if err != nil {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	c.Locals("user_id", claims.UserID)
	return c.Next()
}
