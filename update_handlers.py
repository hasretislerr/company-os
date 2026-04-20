import os
import re

files_to_update = [
    "backend/internal/adapter/handler/workspace_handler.go",
    "backend/internal/adapter/handler/project_handler.go",
    "backend/internal/adapter/handler/board_handler.go"
]

def update_structs(content):
    # Add creator fields to response structs
    struct_patterns = [
        (r'type WorkspaceResponse struct \{.*?\n\}', 'WorkspaceResponse'),
        (r'type ProjectResponse struct \{.*?\n\}', 'ProjectResponse'),
        (r'type BoardResponse struct \{.*?\n\}', 'BoardResponse')
    ]
    for pattern, name in struct_patterns:
        match = re.search(pattern, content, re.DOTALL)
        if match:
            original = match.group(0)
            if 'CreatorFirstName' not in original:
                updated = original.replace('}', '\tCreatorFirstName string `json:"creator_first_name,omitempty"`\n\tCreatorLastName  string `json:"creator_last_name,omitempty"`\n}')
                content = content.replace(original, updated)
    return content

def update_mappings(file_path, content):
    # This is trickier due to many small variations.
    # We will look for RespondWithJSON blocks and add the fields if missing.
    
    # Generic replacement for simple mappings
    # Matching: &domain.Project{ ... } or WorkspaceResponse{ ... }
    
    if "workspace_handler.go" in file_path:
        # Done mostly, but let's check Create specifically
        content = content.replace(
            'UpdatedAt:      workspace.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),\n\t})',
            'UpdatedAt:      workspace.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),\n\t\tCreatorFirstName: workspace.CreatorFirstName,\n\t\tCreatorLastName:  workspace.CreatorLastName,\n\t})'
        )
    elif "project_handler.go" in file_path:
        content = content.replace(
            'UpdatedAt:      project.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),\n\t})',
            'UpdatedAt:      project.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),\n\t\tCreatorFirstName: project.CreatorFirstName,\n\t\tCreatorLastName:  project.CreatorLastName,\n\t})'
        )
        content = content.replace(
            'UpdatedAt:      p.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),\n\t\t})',
            'UpdatedAt:      p.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),\n\t\t\tCreatorFirstName: p.CreatorFirstName,\n\t\t\tCreatorLastName:  p.CreatorLastName,\n\t\t})'
        )
    elif "board_handler.go" in file_path:
        # Specifically targeting RespondWithJSON for board
        content = re.sub(
            r'RespondWithJSON\(w, http.StatusOK, BoardResponse\{.*?\n\t\}\)',
            lambda m: m.group(0).replace('UpdatedAt:   board.UpdatedAt', 'UpdatedAt:      board.UpdatedAt').replace('UpdatedAt:      board.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),', 'UpdatedAt:      board.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),\n\t\tCreatorFirstName: board.CreatorFirstName,\n\t\tCreatorLastName:  board.CreatorLastName,'),
            content, flags=re.DOTALL
        )
        # For list:
        content = content.replace(
            'UpdatedAt:   b.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),',
            'UpdatedAt:      b.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),\n\t\t\tCreatorFirstName: b.CreatorFirstName,\n\t\t\tCreatorLastName:  b.CreatorLastName,'
        )
        
    return content

for file_rel in files_to_update:
    abs_path = os.path.join(r"c:\Users\hasret\.gemini\antigravity\scratch\company-os", file_rel)
    if os.path.exists(abs_path):
        with open(abs_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = update_structs(content)
        new_content = update_mappings(file_rel, new_content)
        
        with open(abs_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file_rel}")
