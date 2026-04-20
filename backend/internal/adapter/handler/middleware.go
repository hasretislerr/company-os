package handler

import (
	"context"
	"log"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/service"
)

type contextKey string

const (
	UserIDKey         contextKey = "user_id"
	UserEmailKey      contextKey = "user_email"
	OrgIDKey          contextKey = "org_id"
	UserRoleKey       contextKey = "user_role"
	UserDepartmentKey contextKey = "user_department"
)

// AuthMiddleware validates JWT and adds user info to context
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenStr := r.Header.Get("Authorization")
		if tokenStr == "" {
			// Check query parameter for WebSockets
			tokenStr = r.URL.Query().Get("token")
		} else {
			parts := strings.Fields(tokenStr)
			if len(parts) >= 2 && strings.EqualFold(parts[0], "Bearer") {
				tokenStr = parts[1]
			}
		}

		// Temizlik ve normalizasyon
		tokenStr = strings.TrimSpace(tokenStr)

		if tokenStr == "" || tokenStr == "null" || tokenStr == "undefined" {
			log.Printf("AUTH: Invalid token value found: '%s' (URL: %s)", tokenStr, r.URL.Path)
			RespondWithError(w, http.StatusUnauthorized, "Authorization token required")
			return
		}

		tokenLog := tokenStr
		if len(tokenStr) > 10 {
			tokenLog = tokenStr[:10] + "..."
		}
		log.Printf("AUTH: Attempting to validate token: %s", tokenLog)
		claims, err := service.ValidateToken(tokenStr)

		if err != nil {
			log.Printf("Token validation failed: %v", err)
			RespondWithError(w, http.StatusUnauthorized, "Invalid token")
			return
		}

		log.Printf("Token validated. UserID: %s, OrgID: %v, Role: %s, Dept: %s", claims.UserID, claims.OrganizationID, claims.Role, claims.Department)

		ctx := r.Context()
		ctx = context.WithValue(ctx, UserIDKey, claims.UserID)
		ctx = context.WithValue(ctx, UserEmailKey, claims.Email)
		if claims.OrganizationID != nil {
			ctx = context.WithValue(ctx, OrgIDKey, *claims.OrganizationID)
		}
		// Add user role and department to context
		if claims.Role != "" {
			ctx = context.WithValue(ctx, UserRoleKey, claims.Role)
		}
		if claims.Department != "" {
			ctx = context.WithValue(ctx, UserDepartmentKey, claims.Department)
		}

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// OrgMiddleware ensures organization context exists
func OrgMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		orgID := r.Context().Value(OrgIDKey)
		if orgID == nil {
			log.Printf("ORG_MIDDLEWARE: Organization ID missing in context!")
			RespondWithError(w, http.StatusForbidden, "Organization context required")
			return
		}
		log.Printf("ORG_MIDDLEWARE: OrgID confirmed: %v", orgID)
		next.ServeHTTP(w, r)

	})
}

// GetUserID extracts user ID from context
func GetUserID(ctx context.Context) (uuid.UUID, bool) {
	userID, ok := ctx.Value(UserIDKey).(uuid.UUID)
	return userID, ok
}

// GetOrgID extracts organization ID from context
func GetOrgID(ctx context.Context) (uuid.UUID, bool) {
	orgID, ok := ctx.Value(OrgIDKey).(uuid.UUID)
	return orgID, ok
}

// GetUserRole extracts user role from context
func GetUserRole(ctx context.Context) (string, bool) {
	role, ok := ctx.Value(UserRoleKey).(string)
	return role, ok
}

// GetUserDepartment extracts user department from context
func GetUserDepartment(ctx context.Context) (string, bool) {
	department, ok := ctx.Value(UserDepartmentKey).(string)
	return department, ok
}

// GetUserEmail extracts user email from context
func GetUserEmail(ctx context.Context) (string, bool) {
	email, ok := ctx.Value(UserEmailKey).(string)
	return email, ok
}
