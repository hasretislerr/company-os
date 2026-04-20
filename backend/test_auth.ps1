# Test Authentication Endpoints

# Register a new user
curl -X POST http://localhost:8080/api/register `
  -H "Content-Type: application/json" `
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User"
  }'

# Login
curl -X POST http://localhost:8080/api/login `
  -H "Content-Type: application/json" `
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
