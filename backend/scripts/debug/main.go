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
		log.Fatal(err)
	}
	defer db.Close()

	rows, err := db.Query("SELECT user_id, organization_id, role FROM organization_members;")
	if err != nil {
		log.Fatal(err)
	}
	for rows.Next() {
		var uID, oID, role string
		rows.Scan(&uID, &oID, &role)
		fmt.Printf("Org Member: User=%s, Org=%s, Role=%s\n", uID, oID, role)
	}
}
