# Smart Hospital Management and AI-Assisted Patient Care System

A local-first student project built with Java 21, Spring Boot, React, TypeScript, Vite, and MySQL.

## Included modules
- Dashboard with live database counts and system status
- Patient registration, search, editing, and deletion
- Doctor directory, search, editing, and deletion
- Appointment scheduling and status updates
- Consultation notes with symptoms, findings, assessment, plan, and follow-up date
- Room and bed inventory with manual patient allocation
- Medicine inventory and low-stock alerts
- AI-assisted patient progress summary and specialty referral suggestions (clearly labelled rule-based demo; requires doctor review)
- MySQL persistence through Flyway migrations
- Local CORS configuration and API health endpoint

## Requirements
- JDK 21
- Maven 3.9+ (or IntelliJ IDEA Maven integration)
- Node.js 20+ and npm
- MySQL Server 8+
- MySQL Workbench is optional, but useful for viewing the database

## 1. Create the MySQL database/user
Run this in MySQL Workbench as an administrator (change the password if you want):

```sql
CREATE DATABASE IF NOT EXISTS smart_hospital_local;
CREATE USER IF NOT EXISTS 'hospital_app'@'localhost' IDENTIFIED BY 'local_dev_change_me';
GRANT ALL PRIVILEGES ON smart_hospital_local.* TO 'hospital_app'@'localhost';
FLUSH PRIVILEGES;
```

If your MySQL user/password differs, edit `backend/src/main/resources/application.yml` or set environment variables:
- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`

Flyway creates the application tables automatically at backend startup.

## 2. Start backend
Open `backend/pom.xml` in IntelliJ IDEA and let Maven import dependencies. Make sure Project SDK is JDK 21.
Run `com.smarthospital.SmartHospitalApplication`, or in a terminal:

```bash
cd backend
mvn spring-boot:run
```

API health check: http://localhost:8080/api/v1/health
API docs: http://localhost:8080/swagger-ui/index.html

## 3. Start frontend
Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Notes
- The app is designed for local development, not production deployment.
- The included AI assistant is a transparent rule-based demo. It does not call an external AI service and does not require internet access once dependencies are installed.
- AI summaries and referral ideas are decision-support drafts only. A qualified clinician must review them.
- This is a student project and must not be used for real clinical decisions without proper clinical, privacy, security, and regulatory review.
