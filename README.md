# 🎟️ Event Booking API

A lightweight, production-ready REST API for **event management and seat booking**, built with **Node.js**, **Express**, and **PostgreSQL**. Features JWT-based authentication, date-range filtering, and safe seat-reservation logic with conflict protection.

---

## 📦 Tech Stack

| Layer        | Technology                  |
|--------------|-----------------------------|
| Runtime      | Node.js (v18+)              |
| Framework    | Express 4                   |
| Database     | PostgreSQL                  |
| Auth         | JWT (HS256, 7-day tokens)   |
| Password     | SHA-256 hashing (built-in)  |
| Environment  | dotenv                      |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **PostgreSQL** v13 or higher

### 1. Clone the repository

```bash
git clone https://github.com/your-username/event-b-api.git
cd event-b-api
```

### 2. Install dependencies

```bash
npm install
```
## author roger

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=event_booking_db
DB_USER=postgres
DB_PASSWORD=your_password

# Must be at least 32 random characters
JWT_SECRET=replace_with_long_random_secret_minimum_32_chars
```

### 4. Set up the database

Create the database in PostgreSQL, then run the schema:

```bash
psql -U postgres -c "CREATE DATABASE event_booking_db;"
psql -U postgres -d event_booking_db -f db/schema.sql
```

### 5. (Optional) Seed sample data

```bash
npm run seed
```

### 6. Start the server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The server will be running at `http://localhost:3000`.

---

## 🗄️ Database Schema

```
┌─────────────────┐       ┌──────────────────────┐       ┌───────────────────┐
│     users       │       │       events          │       │     bookings      │
├─────────────────┤       ├──────────────────────┤       ├───────────────────┤
│ id (PK)         │◄──┐   │ id (PK)              │◄──┐   │ id (PK)           │
│ username        │   │   │ title                │   │   │ event_id (FK)     │
│ email           │   │   │ description          │   │   │ user_id (FK)      │
│ password_hash   │   └───│ created_by (FK)      │   └───│ seats_booked      │
│ created_at      │       │ date                 │       │ booked_at         │
└─────────────────┘       │ total_seats          │       └───────────────────┘
                          │ available_seats      │
                          └──────────────────────┘
```

---

## 📡 API Reference

All endpoints return JSON. Protected routes require the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

---

### 🔐 Authentication

#### Register a new user

```http
POST /register
```

**Request body:**

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response `201`:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

| Validation Rule                          | Status |
|------------------------------------------|--------|
| `username` must be ≥ 2 characters        | `400`  |
| `email` must be a valid email address    | `400`  |
| `password` must be ≥ 8 characters        | `400`  |
| Email or username already taken          | `409`  |

---

#### Login

```http
POST /login
```

**Request body:**

```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response `200`:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

| Error Condition          | Status |
|--------------------------|--------|
| Missing email/password   | `400`  |
| Invalid credentials      | `401`  |

---

### 📅 Events

#### List all events

```http
GET /events
```

**Query parameters:**

| Parameter | Type    | Default | Description                           |
|-----------|---------|---------|---------------------------------------|
| `start`   | ISO date| —       | Filter events from this date          |
| `end`     | ISO date| —       | Filter events up to this date         |
| `limit`   | integer | `20`    | Results per page (1–100)              |
| `offset`  | integer | `0`     | Pagination offset                     |

> `start` and `end` must be provided **together** for date filtering.

**Response `200`:** Array of event objects.

---

#### Get a single event

```http
GET /events/:id
```

**Response `200`:**

```json
{
  "id": 1,
  "title": "Tech Summit 2026",
  "description": "Annual technology conference",
  "date": "2026-08-15T09:00:00.000Z",
  "total_seats": 500,
  "available_seats": 342,
  "created_by": 1
}
```

| Error Condition      | Status |
|----------------------|--------|
| Event not found      | `404`  |
| Invalid ID format    | `400`  |

---

#### Create an event 🔒

```http
POST /events
Authorization: Bearer <token>
```

**Request body:**

```json
{
  "title": "Tech Summit 2026",
  "description": "Annual technology conference",
  "date": "2026-08-15T09:00:00.000Z",
  "total_seats": 500
}
```

**Response `201`:** The created event object.

| Validation Rule                | Status |
|--------------------------------|--------|
| `title` is required            | `400`  |
| `date` must be in the future   | `400`  |
| `total_seats` must be ≥ 1      | `400`  |
| Unauthenticated request        | `401`  |

---

#### Update an event 🔒

```http
PUT /events/:id
Authorization: Bearer <token>
```

All fields are optional — only include what you want to update.

**Request body:**

```json
{
  "title": "Updated Title",
  "total_seats": 600
}
```

**Response `200`:** The updated event object.

| Error Condition                             | Status |
|---------------------------------------------|--------|
| Event not found                             | `404`  |
| Not the event owner                         | `403`  |
| `total_seats` less than already-booked seats| `409`  |
| No fields provided                          | `400`  |

---

### 🎫 Bookings

#### Book seats for an event 🔒

```http
POST /events/:id/book
Authorization: Bearer <token>
```

**Request body:**

```json
{
  "seats": 2
}
```

**Response `201`:**

```json
{
  "id": 42,
  "event_id": 1,
  "user_id": 3,
  "seats_booked": 2,
  "booked_at": "2026-05-25T14:00:00.000Z"
}
```

| Error Condition          | Status |
|--------------------------|--------|
| Event not found          | `404`  |
| Not enough available seats | `409` |
| `seats` not a positive integer | `400` |

---

#### List my bookings 🔒

```http
GET /bookings
Authorization: Bearer <token>
```

**Query parameters:**

| Parameter | Type    | Default | Description          |
|-----------|---------|---------|----------------------|
| `limit`   | integer | `20`    | Results per page (1–100) |
| `offset`  | integer | `0`     | Pagination offset    |

**Response `200`:** Array of the authenticated user's bookings.

---

#### Cancel a booking 🔒

```http
DELETE /bookings/:id
Authorization: Bearer <token>
```

**Response `200`:**

```json
{
  "message": "Booking cancelled successfully"
}
```

| Error Condition          | Status |
|--------------------------|--------|
| Booking not found        | `404`  |
| Not the booking owner    | `403`  |

---

## 📂 Project Structure

```
event-b-api/
├── db/
│   ├── schema.sql          # Database table definitions
│   └── seed.js             # Sample data seeder
├── src/
│   ├── app.js              # Express app setup & route mounting
│   ├── config/             # Database connection config
│   ├── middleware/
│   │   └── auth.js         # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js         # /register, /login
│   │   ├── events.js       # /events CRUD
│   │   └── bookings.js     # /bookings + /events/:id/book
│   ├── services/           # Business logic layer
│   └── utils/
│       └── crypto.js       # Password hashing utilities
├── server.js               # Entry point
├── .env.example            # Environment variable template
└── package.json
```

---

## 🔒 Authentication Flow

1. **Register** or **Login** to receive a JWT token (valid for **7 days**).
2. Include the token in every protected request:
   ```
   Authorization: Bearer <token>
   ```
3. The middleware decodes the token and attaches the `user` object to `req.user`.

---

## ⚠️ Error Responses

All errors follow a consistent format:

```json
{
  "error": "Human-readable error message"
}
```

| Status Code | Meaning                        |
|-------------|--------------------------------|
| `400`       | Bad Request / Validation Error |
| `401`       | Unauthorized (invalid/missing token) |
| `403`       | Forbidden (not the resource owner) |
| `404`       | Resource Not Found             |
| `409`       | Conflict (duplicate / seat shortage) |
| `500`       | Internal Server Error          |

---

## 📜 Available Scripts

| Command        | Description                               |
|----------------|-------------------------------------------|
| `npm start`    | Start the server in production mode       |
| `npm run dev`  | Start with auto-reload (Node.js `--watch`)|
| `npm run seed` | Seed the database with sample data        |

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
