package service

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var jwtSecret = []byte("your-secret-key-change-this-in-production") // TODO: Move to config

type Claims struct {
	UserID         uuid.UUID  `json:"user_id"`
	Email          string     `json:"email"`
	OrganizationID *uuid.UUID `json:"organization_id,omitempty"`
	Role           string     `json:"role,omitempty"`
	Department     string     `json:"department,omitempty"`
	jwt.RegisteredClaims
}

func GenerateToken(userID uuid.UUID, email string) (string, error) {
	return GenerateTokenWithOrg(userID, email, nil, "", "")
}

func GenerateTokenWithOrg(userID uuid.UUID, email string, organizationID *uuid.UUID, role, department string) (string, error) {
	claims := Claims{
		UserID:         userID,
		Email:          email,
		OrganizationID: organizationID,
		Role:           role,
		Department:     department,

		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}
