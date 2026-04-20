package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:password@localhost:5432/company_os?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	// Delete old credentials that were saved without backup flags
	// Users need to re-register their biometric after this fix
	result, err := db.Exec(`DELETE FROM webauthn_credentials`)
	if err != nil {
		log.Fatalf("Failed to clear credentials: %v", err)
	}
	n, _ := result.RowsAffected()
	fmt.Printf("Cleared %d old credential(s). Users must re-register biometric.\n", n)
}
