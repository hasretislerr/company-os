package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/companyos?sslmode=disable"
	}
	
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// 1. Add missing columns to chat_messages
	queries := []string{
		"ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_name TEXT",
		"ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_type TEXT",
		"ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_size BIGINT",
		"ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_url TEXT",
		"ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent'",
		"ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE",
		
		// 2. Create chat_message_deletions table
		`CREATE TABLE IF NOT EXISTS chat_message_deletions (
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
			deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			PRIMARY KEY (user_id, message_id)
		)`,
		"CREATE INDEX IF NOT EXISTS idx_chat_message_deletions_user ON chat_message_deletions(user_id)",
	}

	for _, q := range queries {
		log.Printf("Executing: %s", q)
		_, err = db.Exec(q)
		if err != nil {
			log.Printf("Error executing query: %v", err)
		}
	}

	fmt.Println("Database schema repair completed successfully.")
}
