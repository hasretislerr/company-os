package config

import (
	"bufio"
	"os"
	"strings"
)

func loadEnv() {
	file, err := os.Open(".env")
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "#") || !strings.Contains(line, "=") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			// Tırnakları temizle (eğer varsa)
			value = strings.Trim(value, `"'`)
			os.Setenv(key, value)
		}
	}
}

type Config struct {
	AppPort            string
	DBUrl              string
	RedisUrl           string
	RabbitMQUrl        string // amqp://kullanici:sifre@host:port/vhost
	ElasticsearchUrl   string // http://host:port
	CORSAllowedOrigins string
	SMTPHost           string
	SMTPPort           string
	SMTPUser           string
	SMTPPass           string
	WebAuthnRPID       string
	WebAuthnRPOrigins  string
}

func Load() *Config {
	loadEnv()
	return &Config{
		AppPort:  getEnv("APP_PORT", "8086"),
		DBUrl:    getEnv("DATABASE_URL", "postgres://postgres:password@localhost:5432/company_os?sslmode=disable"),
		RedisUrl: getEnv("REDIS_URL", "localhost:6379"),
		// RabbitMQ — docker-compose'daki company_os_rabbitmq servisiyle uyumlu
		RabbitMQUrl: getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5673/"),
		// Elasticsearch — HTTP basic auth ile
		ElasticsearchUrl:   getEnv("ELASTICSEARCH_URL", "http://elastic:password@localhost:9201"),
		CORSAllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001"),
		SMTPHost:           getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:           getEnv("SMTP_PORT", "587"),
		SMTPUser:           getEnv("SMTP_USER", ""),
		SMTPPass:           getEnv("SMTP_PASS", ""),
		WebAuthnRPID:       getEnv("WEBAUTHN_RP_ID", "localhost"),
		WebAuthnRPOrigins:  getEnv("WEBAUTHN_RP_ORIGINS", "http://localhost:3000,http://localhost:3001"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value
	}
	return fallback
}
