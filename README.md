<p align="center">
  <img src="https://dummyimage.com/1200x300/0f172a/ffffff&text=Company+OS+-+Modern+Company+Management+System" />
</p>
<h1 align="center">🏢 Company OS</h1>

<p align="center">
Şirket yönetimi için geliştirilmiş full-stack platform
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Go-1.22-blue" />
  <img src="https://img.shields.io/badge/Next.js-black" />
  <img src="https://img.shields.io/badge/PostgreSQL-blue" />
  <img src="https://img.shields.io/badge/Docker-blue" />
  <img src="https://img.shields.io/badge/WebSocket-green" />
</p>

# 🏢 Company OS

Şirket yönetimi ve haberleşme için geliştirilmiş, ölçeklenebilir full-stack bir işletim sistemidir. Görev yönetimi, iletişim, toplantılar, izin süreçleri ve organizasyon yönetimini tek bir platformda birleştirir.

---

## 🚀 Projenin Amaçları

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
- Elasticsearch
- Clean Architecture yaklaşımı

### Frontend
- Next.js (React)
- TypeScript
- Tailwind CSS
- App Router

### DevOps
- Docker
- Docker Compose

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
- Chat sistemi
- Bildirim sistemi
- WebSocket tabanlı yapı

### 📅 Takvim & Toplantılar
- Toplantı planlama
- Takvim entegrasyonu
- Hatırlatma sistemi

### 📝 İzin ve Onay Süreçleri
- İzin talepleri
- Çok aşamalı onay sistemi
- Yönetici paneli

### 📊 Aktivite Takibi
- Kullanıcı logları
- Sistem hareket kayıtları

---

## 🏗️ Mimari Yapı

Proje Clean Architecture prensiplerine göre yapılandırılmıştır:

- backend/
- ├── internal/
- │   ├── domain/
- │   ├── service/
- │   ├── adapter/
- │   └── config/
- ├── cmd/
- └── migrations/

---

## ⚙️ Kurulum

### 1. Repo klonlama
git clone https://github.com/hasretislerr/company-os.git
cd company-os

---

### 2. Docker ile çalıştırma
docker-compose up --build

---

### 3. Backend çalıştırma
cd backend
go mod tidy
go run main.go

---

### 4. Frontend çalıştırma
cd frontend
npm install
npm run dev

---

## 🌍 Ortam Değişkenleri


- DB_HOST=localhost
- DB_PORT=5432
- DB_USER=postgres
- DB_PASSWORD=postgres
- DB_NAME=company_os
- JWT_SECRET=secret

---

## 📈 Geliştirme Durumu

- Backend tamamlandı (temel yapı)
- Frontend dashboard hazır
- Chat sistemi aktif
- Task sistemi aktif
- Geliştirme devam ediyor
