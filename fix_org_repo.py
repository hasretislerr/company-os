import os
import re

files_to_update = [
    "backend/internal/adapter/handler/workspace_handler.go",
    "backend/internal/adapter/handler/project_handler.go",
    "backend/internal/adapter/handler/board_handler.go",
    "backend/internal/adapter/repository/organization_repository.go"
]

def update_org_repo(content):
    # Fix the scans in ListAll and GetUserOrganizations
    old_scan = '''err := rows.Scan(
			&org.ID, &org.Name, &org.Slug, &org.PlanType,
			&org.CreatedAt, &org.UpdatedAt, &org.DeletedAt,
		)'''
    new_scan = '''err := rows.Scan(
			&org.ID, &org.Name, &org.Slug, &org.PlanType, &org.CreatedBy,
			&org.CreatedAt, &org.UpdatedAt, &org.DeletedAt,
			&org.CreatorFirstName, &org.CreatorLastName,
		)'''
    return content.replace(old_scan, new_scan)

for file_rel in files_to_update:
    abs_path = os.path.join(r"c:\Users\hasret\.gemini\antigravity\scratch\company-os", file_rel)
    if os.path.exists(abs_path):
        with open(abs_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if "organization_repository.go" in file_rel:
            new_content = update_org_repo(content)
        else:
            # Re-running structural updates is fine if idempotent
            # (already updated mostly, but just in case)
            continue
        
        with open(abs_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file_rel}")
