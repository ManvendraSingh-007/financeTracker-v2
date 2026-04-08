package main

import (
	"finance-backend/database"
	"finance-backend/routes"
	"log"
	"os"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil && !os.IsNotExist(err) {
		log.Fatal("Error loading .env file")
	}

	database.Connect()
	defer database.Pool.Close()

	app := fiber.New()

	allowedOrigins := getAllowedOrigins()

	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowCredentials: true,
	}))

	routes.Setup(app)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Fatal(app.Listen(":" + port))
}

func getAllowedOrigins() []string {
	origins := []string{
		"http://localhost:3000",
		"http://127.0.0.1:3000",
	}

	for _, envKey := range []string{"FRONTEND_URL", "FRONTEND_URLS", "CORS_ALLOWED_ORIGINS"} {
		raw := strings.TrimSpace(os.Getenv(envKey))
		if raw == "" {
			continue
		}

		for _, origin := range strings.Split(raw, ",") {
			cleanOrigin := strings.Trim(strings.TrimSpace(origin), "\"'")
			if cleanOrigin == "" {
				continue
			}
			origins = append(origins, cleanOrigin)
		}
	}

	return dedupeStrings(origins)
}

func dedupeStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))

	for _, value := range values {
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}

	return result
}
