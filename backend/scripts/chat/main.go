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
		log.Fatal("Error loading .env file")
	}

	dbURL := os.Getenv("DATABASE_URL")
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Add chat_message_deletions table
	query := `
		CREATE TABLE IF NOT EXISTS chat_message_deletions (
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
			deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			PRIMARY KEY (user_id, message_id)
		);
		CREATE INDEX IF NOT EXISTS idx_chat_message_deletions_user ON chat_message_deletions(user_id);
	`
	_, err = db.Exec(query)
	if err != nil {
		log.Fatalf("Failed to create chat_message_deletions table: %v", err)
	}

	fmt.Println("Chat schema fix completed successfully.")
}
