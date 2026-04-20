package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hasret/company-os/backend/internal/adapter/repository"
	"github.com/hasret/company-os/backend/internal/domain"
	"github.com/hasret/company-os/backend/internal/service"
)

type AuthHandler struct {
	userRepo       *repository.PostgresUserRepository
	orgRepo        domain.OrganizationRepository
	invitationRepo domain.InvitationRepository
	notifyService  *service.NotificationService
}

func NewAuthHandler(db *sql.DB, notifyService *service.NotificationService) *AuthHandler {
	return &AuthHandler{
		userRepo:       repository.NewPostgresUserRepository(db),
		orgRepo:        repository.NewPostgresOrganizationRepository(db),
		invitationRepo: repository.NewPostgresInvitationRepository(db),
		notifyService:  notifyService,
	}
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  domain.User `json:"user"`
}

// Register is deprecated. Users can only be invited by managers.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	RespondWithError(w, http.StatusForbidden, "Dışarıdan kayıt kapalıdır. Lütfen yöneticinizden sisteme davet etmesini isteyin.")
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	RespondWithError(w, http.StatusForbidden, "Sadece Google ile giriş yapılabilir.")
}

func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	RespondWithError(w, http.StatusForbidden, "Şifre değiştirme kapalıdır. Sistem Google OAuth kullanmaktadır.")
}

type GoogleLoginRequest struct {
	Credential string `json:"credential"` // Google JWT payload
}

func (h *AuthHandler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	var req GoogleLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Geçersiz istek")
		return
	}

	// Fetch user info from Google using the access token
	googleUrl := "https://www.googleapis.com/oauth2/v3/userinfo"
	client := &http.Client{}
	reqVer, err := http.NewRequest("GET", googleUrl, nil)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Doğrulama isteği oluşturulamadı")
		return
	}
	reqVer.Header.Set("Authorization", "Bearer "+req.Credential)

	resp, err := client.Do(reqVer)
	if err != nil {
		fmt.Printf("[Google Auth] Request error: %v\n", err)
		RespondWithError(w, http.StatusUnauthorized, "Google doğrulama başarısız: İstek hatası")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errResp map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errResp)
		fmt.Printf("[Google Auth] Google returned %d: %+v\n", resp.StatusCode, errResp)
		RespondWithError(w, http.StatusUnauthorized, "Google doğrulama başarısız: Erişim anahtarı geçersiz (Status: "+fmt.Sprint(resp.StatusCode)+")")
		return
	}

	var userInfo struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		RespondWithError(w, http.StatusUnauthorized, "Google hesap bilgileri okunamadı")
		return
	}

	if userInfo.Email == "" {
		RespondWithError(w, http.StatusUnauthorized, "Google hesabınızda e-posta adresi bulunamadı")
		return
	}
	email := userInfo.Email

	// Check if user exists
	user, err := h.userRepo.GetByEmail(r.Context(), email)
	if err != nil || user == nil {
		RespondWithError(w, http.StatusUnauthorized, "Sistemde kaydınız bulunmamaktadır. Lütfen yöneticinizin sizi eklediğinden emin olun.")
		return
	}

	// Sign JWT token
	token, err := service.GenerateToken(user.ID, user.Email)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Giriş yapılamadı")
		return
	}

	RespondWithJSON(w, http.StatusOK, AuthResponse{Token: token, User: *user})
}

// Invited by Managers
type InviteRequest struct {
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Email      string `json:"email"`
	Role       string `json:"role"`
	Department string `json:"department"`
}

func (h *AuthHandler) InviteUser(w http.ResponseWriter, r *http.Request) {
	var req InviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Geçersiz istek")
		return
	}

	orgID, ok := GetOrgID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Organizasyon bulunamadı")
		return
	}

	userID, _ := GetUserID(r.Context())

	// Sadece @gmail.com zorunluluğu
	if !strings.HasSuffix(strings.ToLower(req.Email), "@gmail.com") {
		RespondWithError(w, http.StatusBadRequest, "Sadece @gmail.com uzantılı e-posta adresleri eklenebilir.")
		return
	}

	// Check if already an active member of THIS organization
	user, err := h.userRepo.GetByEmail(r.Context(), req.Email)
	if err == nil {
		isMember, err := h.orgRepo.IsMember(r.Context(), user.ID, orgID)
		if err == nil && isMember {
			// Check if they are actually active (not soft-deleted from org)
			// But IsMember might not check deleted_at. Let's be safe.
			RespondWithError(w, http.StatusConflict, "Bu kullanıcı zaten bu organizasyonda mevcut.")
			return
		}
	}

	code := generateVerificationCode()

	inv := &domain.Invitation{
		ID:               uuid.New(),
		OrganizationID:   orgID,
		Email:            req.Email,
		FirstName:        req.FirstName,
		LastName:         req.LastName,
		Role:             req.Role,
		Department:       req.Department,
		VerificationCode: code,
		InvitedBy:        userID,
		CreatedAt:        time.Now(),
		ExpiresAt:        time.Now().Add(24 * time.Hour),
		IsVerified:       false,
	}

	if err := h.invitationRepo.Create(r.Context(), inv); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Davet oluşturulamadı: "+err.Error())
		return
	}

	// Send code to user's email
	subject := "Company OS Daveti - Doğrulama Kodu"
	body := fmt.Sprintf("Merhaba %s,\n\nSisteme davet edildiniz. Yöneticinize iletmeniz gereken doğrulama kodu: %s", req.FirstName, code)
	
	if err := h.notifyService.SendEmail(req.Email, subject, body); err != nil {
		fmt.Println("E-posta gönderilemedi:", err)
		RespondWithError(w, http.StatusInternalServerError, "Doğrulama kodu e-postası gönderilemedi: "+err.Error()+". Lütfen .env dosyasındaki SMTP ayarlarınızı kontrol edin.")
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Doğrulama kodu e-posta adresine başarıyla gönderildi."})
}

type VerifyRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

func (h *AuthHandler) VerifyUser(w http.ResponseWriter, r *http.Request) {
	var req VerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Geçersiz istek")
		return
	}

	orgID, ok := GetOrgID(r.Context())
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Organizasyon bulunamadı")
		return
	}

	inv, err := h.invitationRepo.GetByEmailAndCode(r.Context(), req.Email, req.Code)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Geçersiz e-posta veya doğrulama kodu.")
		return
	}

	if inv.OrganizationID != orgID {
		RespondWithError(w, http.StatusForbidden, "Bu davet bu organizasyon için değil.")
		return
	}

	if time.Now().After(inv.ExpiresAt) {
		RespondWithError(w, http.StatusBadRequest, "Bu davetin süresi dolmuş.")
		return
	}

	// Mark verified
	h.invitationRepo.MarkAsVerified(r.Context(), inv.ID)

	// Create user
	user := &domain.User{
		ID:           uuid.New(),
		Email:        inv.Email,
		PasswordHash: "google-oauth-only", // No password
		FirstName:    inv.FirstName,
		LastName:     inv.LastName,
	}

	if err := h.userRepo.Create(r.Context(), user); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Kullanıcı oluşturulamadı")
		return
	}

	// Add to org
	member := &domain.OrganizationMember{
		ID:             uuid.New(),
		OrganizationID: inv.OrganizationID,
		UserID:         user.ID, // users.id (updated by RETURNING in userRepo.Create)
		Role:           inv.Role,
		Department:     inv.Department,
	}
	if err := h.orgRepo.AddMember(r.Context(), member); err != nil {
		fmt.Printf("Organizasyona üye ekleme hatası (Email: %s): %v\n", inv.Email, err)
		RespondWithError(w, http.StatusInternalServerError, "Kullanıcı organizasyona eklenemedi: "+err.Error())
		return
	}

	// Send Welcome email
	go func() {
		subject := "Company OS'e Hoş Geldiniz!"
		body := fmt.Sprintf("Merhaba %s,\n\nHesabınız onaylandı. Artık 'Google ile Giriş Yap' butonunu kullanarak sisteme girebilirsiniz.", inv.FirstName)
		h.notifyService.SendEmail(inv.Email, subject, body)
	}()

	RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Kullanıcı başarıyla eklendi."})
}

func generateVerificationCode() string {
	rand.Seed(time.Now().UnixNano())
	return fmt.Sprintf("%06d", rand.Intn(1000000))
}
