package database

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func Connect() {
	dbUser := os.Getenv("DB_USER")
	dbPass := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")
	dbSSL  := os.Getenv("DB_SSLMODE")

	// Build the connection string
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		dbUser, dbPass, dbHost, dbPort, dbName, dbSSL)

	var err error
	Pool, err = pgxpool.New(context.Background(), dsn)
	if err != nil {
		log.Fatal("Failed to create connection pool:", err)
	}

	// Always Ping to verify the credentials and network are actually working
	err = Pool.Ping(context.Background())
	if err != nil {
		log.Fatal("Failed to connect to database (Ping failed):", err)
	}

	log.Println("Successfully connected to PostgreSQL!")
}
