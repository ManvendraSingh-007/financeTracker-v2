package handlers

import (
	"context"
	"errors"
	"finance-backend/database"
	"finance-backend/models"
	"finance-backend/utility"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5"
)

func Register(c fiber.Ctx) error {
	req := new(models.SignupRequest)
	if err := c.Bind().Body(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	CurrencyPreference := "INR"

	if req.Username == "" || req.Email == "" || strings.TrimSpace(req.Password) == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "username, email, and password are required",
		})
	}

	hashedPassword, err := utility.HashPassword(req.Password)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not secure password",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var userID uint
	err = database.Pool.QueryRow(
		ctx,
		`INSERT INTO users (username, email, password, currency_preference)
		 VALUES ($1, $2, $3, $4)
		 RETURNING user_id`,
		req.Username,
		req.Email,
		hashedPassword,
		CurrencyPreference,
	).Scan(&userID)
	if err != nil {
		return c.Status(http.StatusConflict).JSON(fiber.Map{
			"error": "Email or username already exists",
		})
	}

	token, err := utility.GenerateJWT(userID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create session",
		})
	}

	setAuthCookie(c, token)

	return c.Status(http.StatusCreated).JSON(fiber.Map{
		"message": "Signup successful",
		"user": fiber.Map{
			"user_id":             userID,
			"username":            req.Username,
			"email":               req.Email,
			"currency_preference": CurrencyPreference,
		},
	})
}

func Login(c fiber.Ctx) error {
	req := new(models.LoginRequest)
	if err := c.Bind().Body(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || strings.TrimSpace(req.Password) == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "email and password are required",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	err := database.Pool.QueryRow(
		ctx,
		`SELECT user_id, username, email, password, currency_preference, created_at, updated_at
		 FROM users
		 WHERE email = $1`,
		req.Email,
	).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.CurrencyPreference,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid credentials",
			})
		}

		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not fetch user",
		})
	}

	if err := utility.CheckPasswordHash(req.Password, user.PasswordHash); err != nil {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid credentials",
		})
	}

	token, err := utility.GenerateJWT(user.ID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create session",
		})
	}

	setAuthCookie(c, token)

	return c.Status(http.StatusOK).JSON(fiber.Map{
		"message": "Login successful",
		"user": fiber.Map{
			"user_id":             user.ID,
			"username":            user.Username,
			"email":               user.Email,
			"currency_preference": user.CurrencyPreference,
		},
	})
}

func Me(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	err := database.Pool.QueryRow(
		ctx,
		`SELECT user_id, username, email, password, currency_preference, created_at, updated_at
		 FROM users
		 WHERE user_id = $1`,
		userID,
	).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.CurrencyPreference,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{
		"user": fiber.Map{
			"user_id":             user.ID,
			"username":            user.Username,
			"email":               user.Email,
			"currency_preference": user.CurrencyPreference,
		},
	})
}

func Logout(c fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{
		Name:     "jwt",
		Value:    "",
		HTTPOnly: true,
		Secure:   os.Getenv("APP_ENV") == "production",
		SameSite: fiber.CookieSameSiteLaxMode,
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
	})

	return c.Status(http.StatusOK).JSON(fiber.Map{
		"message": "Logged out",
	})
}

func setAuthCookie(c fiber.Ctx, token string) {
	isProd := os.Getenv("APP_ENV") == "production"

	cookie := &fiber.Cookie{
		Name:     "jwt",
		Value:    token,
		HTTPOnly: true,
		Path:     "/",
		Expires:  time.Now().Add(72 * time.Hour),
	}

	if isProd {
		cookie.Secure = true // Hardcode to true for Production
		cookie.SameSite = "None"
	} else {
		cookie.Secure = false
		cookie.SameSite = "Lax"
	}

	c.Cookie(cookie)
}
