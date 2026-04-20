import os
import re

handlers_dir = r"c:/Users/hasret/.gemini/antigravity/scratch/company-os/backend/internal/adapter/handler"

error_pattern = re.compile(r'http\.Error\(\s*w\s*,\s*(.*?),\s*(http\.[A-Za-z0-9_]+)\s*\)')
json_pattern = re.compile(r'w\.Header\(\)\.Set\("Content-Type",\s*"application/json"\)\s*json\.NewEncoder\(w\)\.Encode\((.*?)\)', re.DOTALL)

for filename in os.listdir(handlers_dir):
    if not filename.endswith('.go') or filename == 'response.go':
        continue
    
    filepath = os.path.join(handlers_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if we need to process
    original_content = content
    
    # 1. Replace http.Error(w, message, code)
    # We want: RespondWithError(w, code, message)
    content = error_pattern.sub(r'RespondWithError(w, \2, \1)', content)
    
    # 2. Replace json encode block
    # We want: RespondWithJSON(w, http.StatusOK, data)
    content = json_pattern.sub(r'RespondWithJSON(w, http.StatusOK, \1)', content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Refactored: {filename}")
