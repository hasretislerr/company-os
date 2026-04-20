package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/hasret/company-os/backend/internal/adapter/handler"
	"github.com/hasret/company-os/backend/internal/adapter/messaging"
	"github.com/hasret/company-os/backend/internal/adapter/repository"
	"github.com/hasret/company-os/backend/internal/adapter/search"
	"github.com/hasret/company-os/backend/internal/config"
	"github.com/hasret/company-os/backend/internal/service"
	"github.com/redis/go-redis/v9"
)

func main() {
	cfg := config.Load()

	db, err := repository.NewPostgresDB(cfg.DBUrl)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	fmt.Printf("Database connection established. Allowed Origins: %s\n", cfg.CORSAllowedOrigins)
	fmt.Printf("SMTP Config: Host=%s, Port=%s, User=%s\n", cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser)

	// ─── RabbitMQ Bağlantısı ─────────────────────────────────────────
	// AMQP protokolüyle RabbitMQ'ya bağlan.
	// Bağlantı koparsa rabbitmq.go içindeki reconnectLoop otomatik yeniden bağlanır.
	rmq, err := messaging.NewRabbitMQ(cfg.RabbitMQUrl)
	if err != nil {
		// RabbitMQ bağlantısı zorunlu değil; sadece uyarı ver, devam et.
		log.Printf("⚠️ RabbitMQ bağlantısı kurulamadı: %v (mesajlaşma devre dışı)", err)
	} else {
		defer rmq.Close()
		// Exchange, queue ve binding'leri oluştur (idempotent: birden fazla çalıştırılabilir)
		if err := messaging.Setup(rmq); err != nil {
			log.Printf("⚠️ RabbitMQ topology kurulum hatası: %v", err)
		} else {
			fmt.Println("RabbitMQ bağlantısı ve topology hazır")
		}
	}

	// ─── Redis Bağlantısı ───────────────────────────────────────────
	redisClient := redis.NewClient(&redis.Options{
		Addr: cfg.RedisUrl,
	})
	// Basit bir ping ile kontrol edelim
	if err := redisClient.Ping(context.Background()).Err(); err != nil {
		log.Printf("⚠️ Redis bağlantı hatası: %v", err)
	} else {
		fmt.Println("Redis bağlantısı kuruldu")
	}
	defer redisClient.Close()

	// ─── Elasticsearch Bağlantısı ──────────────────────────────────
	es, err := search.NewElasticsearch(cfg.ElasticsearchUrl)
	if err != nil {
		log.Printf("⚠️ Elasticsearch bağlantısı kurulamadı: %v (arama devre dışı)", err)
	} else {
		// Index ve mapping'leri kur (tasks, users, announcements)
		if err := es.SetupIndices(context.Background()); err != nil {
			log.Printf("⚠️ Elasticsearch index kurulum hatası: %v", err)
		} else {
			fmt.Println("Elasticsearch hazır ve log/indexlemeye açık")
		}
	}

	// Create common indexer and searcher instances
	var indexer *search.Indexer
	var searcher *search.Searcher
	if es != nil {
		indexer = search.NewIndexer(es)
		searcher = search.NewSearcher(es)
	}

	// Initialize router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"}, // Allow all for local development/testing
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Organization-ID", "ngrok-skip-browser-warning"},
		AllowCredentials: true,
	}))

	// Handlers
	userRepo := repository.NewPostgresUserRepository(db)
	notificationRepo := repository.NewPostgresNotificationRepository(db)

	var publisher *messaging.Publisher
	if err == nil { // rmq başarıyla oluşturulduysa
		publisher = messaging.NewPublisher(rmq, messaging.ExchangeEvents)
	}

	notifyService := service.NewNotificationService(notificationRepo, userRepo, publisher)

	// ─── RabbitMQ Workers ────────────────────────────────────────────
	if rmq != nil {
		notificationWorker := service.NewNotificationWorker(rmq, notificationRepo, userRepo)
		go func() {
			if err := notificationWorker.Start(context.Background()); err != nil {
				log.Printf("⚠️ NotificationWorker hatası: %v", err)
			}
		}()
		fmt.Println("🐇 RabbitMQ worker'ları dinlemeye başladı")
	}

	authHandler := handler.NewAuthHandler(db, notifyService)
	orgRepo := repository.NewPostgresOrganizationRepository(db)
	orgHandler := handler.NewOrganizationHandler(db, notifyService, indexer)
	userHandler := handler.NewUserHandler(userRepo, indexer)
 
	workspaceRepo := repository.NewPostgresWorkspaceRepository(db)
	workspaceHandler := handler.NewWorkspaceHandler(workspaceRepo, indexer)
 
	projectRepo := repository.NewPostgresProjectRepository(db)
	projectHandler := handler.NewProjectHandler(projectRepo, indexer)
 
	boardRepo := repository.NewPostgresBoardRepository(db)
	boardHandler := handler.NewBoardHandler(boardRepo, notifyService)
 
	taskRepo := repository.NewPostgresTaskRepository(db)
	taskHandler := handler.NewTaskHandler(taskRepo, boardRepo, userRepo, notifyService, indexer)

	leaveRequestRepo := repository.NewPostgresLeaveRequestRepository(db)
	leaveRequestService := service.NewLeaveRequestService(leaveRequestRepo)
	leaveRequestHandler := handler.NewLeaveRequestHandler(leaveRequestService)

	attendanceRepo := repository.NewPostgresAttendanceRepository(db)
	attendanceService := service.NewAttendanceService(attendanceRepo, leaveRequestRepo, notifyService)
	attendanceHandler := handler.NewAttendanceHandler(attendanceService)
	attendanceWorker := service.NewAttendanceWorker(attendanceRepo, orgRepo, notifyService)
	go attendanceWorker.Start(context.Background())

	chatRepo := repository.NewPostgresChatRepository(db)
	chatHub := handler.NewChatHub(userRepo)
	go chatHub.Run()
	chatHandler := handler.NewChatHandler(chatRepo, userRepo, chatHub, notifyService)

	announcementRepo := repository.NewAnnouncementRepository(db)
	announcementHandler := handler.NewAnnouncementHandler(announcementRepo, orgRepo, notifyService, indexer)

	meetingRepo := repository.NewPostgresMeetingRepository(db)
	meetingHandler := handler.NewMeetingHandler(meetingRepo)
	callHub := handler.NewCallHub()
	go callHub.Run()
	callHandler := handler.NewCallHandler(callHub)

	searchHandler := handler.NewSearchHandler(searcher)
	healthHandler := handler.NewHealthHandler(db, es, rmq, redisClient)

	webAuthnRepo := repository.NewPostgresWebAuthnRepository(db)
	webAuthnSvc, _ := service.NewWebAuthnService(userRepo, webAuthnRepo, cfg)
	webAuthnHandler := handler.NewWebAuthnHandler(webAuthnSvc)

	requestRepo := repository.NewRequestRepository(db)
	requestService := service.NewRequestService(requestRepo, userRepo, notificationRepo)
	requestHandler := handler.NewRequestHandler(requestService, requestRepo, userRepo, orgRepo)

	calendarSvc := service.NewCalendarService(taskRepo, meetingRepo, leaveRequestRepo)
	calendarHandler := handler.NewCalendarHandler(calendarSvc)

	go func() {
		for {
			requestService.ProcessEscalations(context.Background())
			time.Sleep(1 * time.Minute)
		}
	}()

	uploadHandler := handler.NewUploadHandler("./uploads")

	// Static files
	workDir, _ := os.Getwd()
	filesDir := http.Dir(filepath.Join(workDir, "uploads"))
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(filesDir)))

	// Routes
	r.Route("/api", func(r chi.Router) {
		// Public routes
		r.Post("/auth/google", authHandler.GoogleLogin)

		// Eski kayıt vs endpointlerini yine tutalım ama içleri kapalı durumda
		r.Post("/register", authHandler.Register)
		r.Post("/login", authHandler.Login)
		r.Get("/health", healthHandler.Check)

		// Protected routes (require global authentication)
		r.Group(func(r chi.Router) {
			r.Use(handler.AuthMiddleware)

			// Admin specific - System wide user list

			fmt.Println("Registering /api/admin/users/all")
			r.Get("/admin/users/all", userHandler.ListAllUsers)
			r.Put("/users/change-password", authHandler.ChangePassword)

			// User Profile & Settings
			r.Get("/users/profile", userHandler.GetProfile)
			r.Put("/users/profile", userHandler.UpdateProfile)

			// Organization management
			r.Post("/organizations", orgHandler.Create)
			r.Get("/organizations", orgHandler.List)
			r.Post("/organizations/{id}/select", orgHandler.Select)
			r.Put("/organizations/{id}/members/{userId}/role", orgHandler.UpdateMemberRole)

			// Request (Talep) routes (Global / Org Optional)
			r.Post("/requests", requestHandler.CreateRequest)
			r.Get("/requests", requestHandler.GetRequests)
			r.Put("/requests/{id}/status", requestHandler.UpdateRequestStatus)

			// Routes requiring specific organization context
			r.Group(func(r chi.Router) {
				r.Use(handler.OrgMiddleware)

				// Global Search Route
				r.Get("/search", searchHandler.Search)
 
				// Notification routes
				notificationRepo := repository.NewPostgresNotificationRepository(db)
				notificationHandler := handler.NewNotificationHandler(notificationRepo)
				r.Get("/notifications", notificationHandler.List)
				r.Get("/notifications/unread-count", notificationHandler.GetUnreadCount)
				r.Put("/notifications/{id}/read", notificationHandler.MarkAsRead)
				r.Put("/notifications/read-all", notificationHandler.MarkAllAsRead)
				r.Put("/notifications/mark-read", notificationHandler.MarkByTypeAndRef)
				r.Put("/notifications/mark-read-type", notificationHandler.MarkAllByType)
				r.Get("/notifications/unread-counts", notificationHandler.GetUnreadCountsGroupByRef)
 
				// Summary routes
				summaryHandler := handler.NewSummaryHandler(db)
				r.Get("/sidebar/counts", summaryHandler.GetSidebarCounts)

				// Workspace routes
				r.Post("/workspaces", workspaceHandler.Create)
				r.Get("/workspaces", workspaceHandler.List)
				r.Get("/workspaces/{id}", workspaceHandler.GetByID)
				r.Put("/workspaces/{id}", workspaceHandler.Update)
				r.Delete("/workspaces/{id}", workspaceHandler.Delete)

				// Project routes
				r.Post("/projects", projectHandler.Create)
				r.Get("/projects", projectHandler.List)
				r.Get("/projects/{id}", projectHandler.GetByID)
				r.Put("/projects/{id}", projectHandler.Update)
				r.Delete("/projects/{id}", projectHandler.Delete)
				r.Get("/workspaces/{id}/projects", projectHandler.ListByWorkspace)

				// Board routes
				r.Post("/boards", boardHandler.Create)
				r.Get("/projects/{id}/boards", boardHandler.ListByProject)
				r.Get("/boards/{id}", boardHandler.GetByID)
				r.Put("/boards/{id}", boardHandler.Update)
				r.Delete("/boards/{id}", boardHandler.Delete)
				r.Post("/boards/{id}/columns", boardHandler.CreateColumn)
				r.Put("/boards/{id}/columns/{columnId}", boardHandler.UpdateColumn)

				// Task routes
				r.Get("/my-tasks", taskHandler.GetMyTasks)
				r.Post("/tasks", taskHandler.Create)
				r.Get("/boards/{id}/tasks", taskHandler.ListByBoard)
				r.Get("/tasks/{id}", taskHandler.GetByID)
				r.Put("/tasks/{id}", taskHandler.Update)
				r.Delete("/tasks/{id}", taskHandler.Delete)

				// Organization specific users
				r.Get("/users", userHandler.ListOrganizationUsers)
				r.Delete("/users/{id}", userHandler.DeleteUser)

				// User Invitation Flow
				r.Post("/users/invite", authHandler.InviteUser)
				r.Post("/users/verify", authHandler.VerifyUser)

				// Leave Request routes
				r.Post("/leaves", leaveRequestHandler.Create)
				r.Get("/leaves", leaveRequestHandler.ListMyRequests)
				r.Get("/leaves/incoming", leaveRequestHandler.ListIncomingRequests)
				r.Put("/leaves/{id}/status", leaveRequestHandler.UpdateStatus)

				// Chat routes
				r.Get("/chat/rooms", chatHandler.ListRooms)
				r.Post("/chat/rooms", chatHandler.CreateRoom)
				r.Get("/chat/rooms/{roomId}/messages", chatHandler.GetMessages)
				r.Post("/chat/rooms/{roomId}/messages", chatHandler.SendMessage)
				r.Put("/chat/messages/{id}/read", chatHandler.MarkRead)
				r.Delete("/chat/messages/{id}", chatHandler.DeleteMessage)
				r.Delete("/chat/rooms/{id}", chatHandler.DeleteRoom)
				r.Put("/chat/rooms/{id}", chatHandler.UpdateRoom)
				r.Get("/chat/ws", chatHandler.Connect)

				// Meeting routes
				r.Post("/meetings", meetingHandler.Create)
				r.Get("/meetings", meetingHandler.List)
				r.Get("/meetings/{id}", meetingHandler.Get)
				r.Delete("/meetings/{id}", meetingHandler.Delete)
				r.Put("/meetings/{id}/status", meetingHandler.UpdateStatus)
				r.Get("/meetings/call/ws", callHandler.Connect)

				// Announcement routes
				r.Post("/announcements", announcementHandler.Create)
				r.Get("/announcements", announcementHandler.List)

				// Attendance routes
				r.Post("/attendance/check-in", attendanceHandler.CheckIn)
				r.Post("/attendance/check-out", attendanceHandler.CheckOut)
				r.Get("/attendance/daily", attendanceHandler.List)
				r.Put("/attendance/{id}", attendanceHandler.Update)
				r.Get("/attendance/{id}/logs", attendanceHandler.GetLogs)

				// WebAuthn routes
				r.Get("/webauthn/register/begin", webAuthnHandler.BeginRegistration)
				r.Post("/webauthn/register/finish", webAuthnHandler.FinishRegistration)
				r.Get("/webauthn/login/begin", webAuthnHandler.BeginLogin)
				r.Post("/webauthn/login/finish", webAuthnHandler.FinishLogin)

				r.Post("/upload", uploadHandler.Upload)

				// Calendar route
				r.Get("/calendar/events", calendarHandler.GetEvents)
			})

		})
	})

	srv := &http.Server{
		Addr:    ":" + cfg.AppPort,
		Handler: r,
	}

	// ─── Graceful Shutdown Sinyallerini Dinle ───────────────────────
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		fmt.Printf("🚀 Company OS Backend is running on port %s\n", cfg.AppPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Listen: %s\n", err)
		}
	}()

	<-stop // Bir sinyal gelene kadar blokla

	fmt.Println("\n⌛ Shutting down gracefully...")

	// Kapatma işlemi için 10 saniye süre tanı
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server Shutdown Failed:%+v", err)
	}

	// Bağlantıları kapat
	rmq.Close()
	redisClient.Close()
	fmt.Println("👋 Connections closed. Goodbye!")
}
