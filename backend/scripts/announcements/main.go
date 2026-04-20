package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	db, err := sql.Open("postgres", "postgres://postgres:password@localhost:5432/company_os?sslmode=disable")
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// 1. Check if target_departments exists
	var exists bool
	err = db.QueryRow("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='target_departments')").Scan(&exists)
	if err != nil {
		log.Fatal(err)
	}

	if !exists {
		fmt.Println("Fixing target_departments...")
		// Check target_department (singular)
		var singularExists bool
		db.QueryRow("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='target_department')").Scan(&singularExists)
		
		if singularExists {
			db.Exec("ALTER TABLE announcements RENAME COLUMN target_department TO target_departments_legacy")
		}
		
		_, err = db.Exec("ALTER TABLE announcements ADD COLUMN target_departments VARCHAR[] DEFAULT '{}'")
		if err != nil {
			fmt.Printf("Error adding target_departments: %v\n", err)
		} else if singularExists {
			db.Exec("UPDATE announcements SET target_departments = ARRAY[target_departments_legacy] WHERE target_departments_legacy IS NOT NULL AND target_departments_legacy != ''")
		}
	}

	// 2. Check if target_roles exists
	var rolesExists bool
	err = db.QueryRow("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='target_roles')").Scan(&rolesExists)
	if err != nil {
		log.Fatal(err)
	}

	if !rolesExists {
		fmt.Println("Adding target_roles...")
		_, err = db.Exec("ALTER TABLE announcements ADD COLUMN target_roles VARCHAR[] DEFAULT '{}'")
		if err != nil {
			fmt.Printf("Error adding target_roles: %v\n", err)
		}
	}

	fmt.Println("Database schema check and fix completed successfully.")
}
