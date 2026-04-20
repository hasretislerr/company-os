package main

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/hasret/company-os/backend/internal/config"
	_ "github.com/lib/pq"
)

func main() {
	// Load config to get DB URL
	// We might need to set env vars if config depends on them,
	// but usually it loads from .env or defaults.
	// Assuming .env is in backend root, we need to chdir there or copy .env

	// For simplicity, let's try to load config. If it fails, we might need to hardcode or pass flags.
	cfg := config.Load()

	// Override with a default if empty (local dev)
	dbURL := cfg.DBUrl
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/company_os?sslmode=disable"
		fmt.Println("Config DB_URL is empty, using default:", dbURL)
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to open DB: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping DB: %v", err)
	}

	fmt.Println("Connected to DB, altering tasks table...")

	// Alter description column to TEXT
	// We use USING to cast existing data
	_, err = db.Exec(`ALTER TABLE tasks ALTER COLUMN description TYPE TEXT USING description::text;`)
	if err != nil {
		log.Fatalf("Failed to alter table: %v", err)
	}

	fmt.Println("Successfully changed tasks.description to TEXT.")
}
