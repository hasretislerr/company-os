import os

files = [
    r"c:/Users/hasret/.gemini/antigravity/scratch/company-os/backend/internal/adapter/handler/notification_handler.go",
    r"c:/Users/hasret/.gemini/antigravity/scratch/company-os/backend/internal/adapter/handler/summary_handler.go"
]

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.readlines()
    
    new_content = []
    for line in content:
        if '"encoding/json"' not in line:
            new_content.append(line)
            
    with open(f, 'w', encoding='utf-8') as file:
        file.writelines(new_content)
