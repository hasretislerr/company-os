package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/hasret/company-os/backend/internal/config"
	_ "github.com/lib/pq"
)

func main() {
	cfg := config.Load()

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

	fmt.Println("Connected to DB, running approval stages migration...")

	// Read migration file
	migrationSQL, err := os.ReadFile("migrations/000003_add_approval_stages.up.sql")
	if err != nil {
		log.Fatalf("Failed to read migration file: %v", err)
	}

	// Execute migration
	_, err = db.Exec(string(migrationSQL))
	if err != nil {
		log.Fatalf("Failed to run migration: %v", err)
	}

	fmt.Println("Successfully added approval stages to leave_requests table!")
}
