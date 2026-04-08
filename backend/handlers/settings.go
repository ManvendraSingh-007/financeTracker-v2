package handlers

import (
	"context"
	"errors"
	"finance-backend/database"
	"finance-backend/models"
	"finance-backend/utility"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5"
)

func UpdateProfile(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	update := new(models.ProfileUpdate)
	if err := c.Bind().Body(update); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := database.Pool.Exec(ctx, "UPDATE users SET username = $1 WHERE user_id = $2", update.Username, userID)
	if err != nil {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Failed to update"})
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{"update": update.Username})
}

func UpdatePassword(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	update := new(models.PasswordUpdate)
	if err := c.Bind().Body(update); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var hashedPassword string
	err := database.Pool.QueryRow(ctx, "SELECT password FROM users WHERE user_id = $1", userID).Scan(&hashedPassword)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
	}

	err = utility.CheckPasswordHash(update.CurrentPassword, hashedPassword)
	if err != nil {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid Password"})
	}

	newHashedPassword, err := utility.HashPassword(update.NewPassword)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	_, err = database.Pool.Exec(ctx, "UPDATE users SET password = $1 WHERE user_id = $2", newHashedPassword, userID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update"})
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{"update": "Success"})
}

func UpdatePreferences(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	prefs := new(models.PreferencesUpdate)
	if err := c.Bind().Body(prefs); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Check if preferences record exists
	var count int
	err := database.Pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM user_preferences WHERE user_id = $1",
		userID).Scan(&count)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Database error"})
	}

	var query string
	if count == 0 {
		// Insert new preferences
		query = `
            INSERT INTO user_preferences 
            (user_id, currency, theme, budget_alerts, goal_alerts, notification_frequency) 
            VALUES ($1, $2, $3, $4, $5, $6)`
	} else {
		// Update existing preferences
		query = `
            UPDATE user_preferences 
            SET currency = $2, theme = $3, budget_alerts = $4, 
                goal_alerts = $5, notification_frequency = $6, updated_at = NOW()
            WHERE user_id = $1`
	}

	_, err = database.Pool.Exec(ctx, query,
		userID,
		prefs.Currency,
		prefs.Theme,
		prefs.BudgetAlerts,
		prefs.GoalAlerts,
		prefs.NotificationFrequency,
	)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update preferences"})
	}

	_, err = database.Pool.Exec(ctx, "UPDATE users SET currency_preference = $1 WHERE user_id = $2", prefs.Currency, userID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update preferences"})
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{
		"message":     "Preferences updated successfully",
		"preferences": prefs,
	})
}

func DeleteAccount(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := database.Pool.Exec(ctx, "DELETE FROM users WHERE user_id = $1", userID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Error deleting user"})
	}

	// Clear the auth cookie by calling Logout handler
	Logout(c)
	return c.Status(http.StatusOK).JSON(fiber.Map{"success": "User Deleted"})
}
