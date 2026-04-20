# 🏢 Company OS

Şirket yönetimi ve haberleşme için geliştirilmiş, ölçeklenebilir full-stack bir işletim sistemidir.  
Görev yönetimi, iletişim, toplantılar, izin süreçleri ve organizasyon yönetimini tek bir platformda birleştirir.

---

## 🚀 Projenin Amaçları : 

- Şirket içi süreçleri dijitalleştirmek
- Takım içi iletişimi kolaylaştırmak
- Görev ve proje takibini düzenlemek
- İş akışlarını merkezi hale getirmek

---

## 🧱 Kullanılan Teknolojiler

### Backend
- Go (Golang)
- REST + WebSocket mimarisi
- PostgreSQL
- RabbitMQ (event-driven yapı)
- Elasticsearch (arama altyapısı)
- Clean Architecture yaklaşımı

### Frontend
- Next.js (React)
- TypeScript
- Tailwind CSS
- App Router mimarisi

### DevOps
- Docker
- Docker Compose
- Mikroservis uyumlu yapı
- WebSocket

---

## 📦 Özellikler

### 👥 Organizasyon Yönetimi
- Şirket oluşturma ve yönetme
- Departman ve rol sistemi
- Üye davet sistemi

### 📋 Görev Sistemi
- Proje ve task yönetimi
- Sürükle-bırak board sistemi
- Öncelik ve durum takibi

### 💬 Gerçek Zamanlı İletişim
- Anlık mesajlaşma (chat)
- Bildirim sistemi
- WebSocket tabanlı iletişim

### 📅 Takvim & Toplantılar
- Toplantı planlama
- Takvim entegrasyonu
- Hatırlatma sistemi

### 📝 İzin ve Onay Süreçleri
- İzin talepleri
- Çok aşamalı onay mekanizması
- Yönetici paneli

### 📊 Aktivite Takibi
- Kullanıcı aktivite logları
- Sistem hareket kayıtları

---

## 🏗️ Mimari Yapı

Proje **Clean Architecture** prensiplerine göre yapılandırılmıştır:
backend/
├── internal/
│ ├── domain/ # İş kuralları
│ ├── service/ # Business logic
│ ├── adapter/ # Dış dünya (DB, API)
│ └── config/ # Konfigürasyon
├── cmd/ # Uygulama entrypoint
└── migrations/ # Veritabanı şeması


---

## ⚙️ Kurulum

### 1. Repoyu klonla
```bash
git clone https://github.com/hasretislerr/company-os.git
cd company-os

---

### 2. Docker ile çalıştırma (önerilen)

docker-compose up --build

---

### 3. Backend çalıştırma
```bash
cd backend
go mod tidy
go run main.go

---

### 4. Frontend çalıştırma
```bash
cd frontend
npm install
npm run dev

---

## Ortam Değişkenleri

Backend için `.env` dosyası:

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=company_os

JWT_SECRET=secret

---


## Geliştirme Durumu

- Temel backend sistemi hazır
- Frontend dashboard hazır
- Chat sistemi mevcut
- Task sistemi mevcut
- Geliştirme devam ediyor

---
