package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load(".env")
	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		dbUrl = "postgres://postgres:postgres@localhost:5432/company_os?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbUrl)
	if err != nil {
		log.Fatalf("DB Connection error: %v", err)
	}
	defer db.Close()

	ctx := context.Background()

	commands := []string{
		`ALTER TABLE board_columns ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);`,
		`ALTER TABLE board_columns ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,
		`ALTER TABLE board_columns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,
		`ALTER TABLE board_columns ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;`,
	}

	for _, cmd := range commands {
		fmt.Printf("Executing: %s\n", cmd)
		_, err := db.ExecContext(ctx, cmd)
		if err != nil {
			fmt.Printf("Error executing command: %v\n", err)
		} else {
			fmt.Println("Success.")
		}
	}

	fmt.Println("Board columns schema updated successfully.")
}
