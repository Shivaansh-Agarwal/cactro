# Event Booking System

A Node.js REST API for event management with MongoDB and RabbitMQ.

## Quick Start

```bash
# Start everything (MongoDB, RabbitMQ, API + Worker)
docker-compose up --build
```

## Access

| Service | URL | Credentials |
|---------|-----|-------------|
| API | http://localhost:3001 | - |
| RabbitMQ | http://localhost:15672 | admin / password123 |

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/events` | None | List events |
| POST | `/api/events` | Organizer | Create event |
| PUT | `/api/events/:id` | Organizer (Owner) | Update event |
| GET | `/api/bookings/:eventId` | None | Get bookings |
| POST | `/api/bookings` | Customer | Create booking |

## Test Users

- **Organizer**: `Authorization: Bearer organizer_101`
- **Customer**: `Authorization: Bearer customer_202`

## Examples

```bash
# Get events
curl http://localhost:3001/api/events

# Create event (as organizer)
curl -X POST http://localhost:3001/api/events \
  -H "Authorization: Bearer organizer_101" \
  -H "Content-Type: application/json" \
  -d '{"title": "Tech Conference", "date": "2026-12-31"}'

# Create booking (as customer)
curl -X POST http://localhost:3001/api/bookings \
  -H "Authorization: Bearer customer_202" \
  -H "Content-Type: application/json" \
  -d '{"eventId": 1, "customerId": 202, "ticketsCount": 2}'
```

## Stop

```bash
docker-compose down
```# Event Booking System API Backend

This project implements the backend APIs using Node.js and Express.js. It features robust Role-Based Access Control (RBAC), MongoDB for data persistence, and RabbitMQ for reliable, scalable background task processing.

## 📖 System Overview

The system manages event booking, restricting actions based on user roles:

- **Event Organizer**: Manages event CRUD
- **Customer**: Browses and books tickets

## 🚀 Quick Start (with Docker)

### 1. Start MongoDB and RabbitMQ

```bash
docker-compose up -d
```

### 2. Verify services

```bash
docker-compose ps
```

### 3. Start the API Server

```bash
node src/server.js
```

### 4. Start the Worker (separate terminal)

```bash
node src/worker.js
```

## 📋 Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| API Server | http://localhost:3000 | - |
| RabbitMQ Management UI | http://localhost:15672 | admin / password123 |
| MongoDB | localhost:27017 | admin / password123 |

## 🔐 Test Authentication

- **Organizer**: `Authorization: Bearer organizer_101`
- **Customer**: `Authorization: Bearer customer_202`

## 📝 API Endpoints

### Events

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/events` | List all events | No |
| POST | `/api/events` | Create new event | Organizer |
| PUT | `/api/events/:id` | Update event | Organizer (Owner) |

### Bookings

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/bookings` | Create booking | Customer |

## 💡 Design Decisions

1. **Framework (Express.js)**: Modular structure for REST APIs with middleware for security.

2. **RBAC**: Middleware validates user tokens and role permissions.

3. **Database (MongoDB)**: Flexible JSON-like documents for evolving data structures.

4. **Message Broker (RabbitMQ)**: Enterprise-grade reliability with Exchanges and Bindings.

5. **Outbox Pattern**: Ensures atomicity between DB commits and message publishing.

6. **Idempotent Consumers**: Workers track processed messages to handle duplicates safely.

## 🛠️ Environment Variables

Create a `.env` file (already provided):

```env
MONGODB_URI=mongodb://admin:password123@localhost:27017/event_booking?authSource=admin
RABBITMQ_URI=amqp://admin:password123@localhost:5672
PORT=3000
NODE_ENV=development
```Event Booking System API Backend (Node.js Implementation - RabbitMQ)
This project implements the backend APIs using Node.js and Express.js. It features robust Role-Based Access Control (RBAC) and utilizes the RabbitMQ for reliable, scalable background task processing.

📖 System Overview

The system manages event booking, restricting actions based on user roles:

Event Organizer: Manages event CRUD.
Customer: Browses and books tickets.

💡 Design Decisions

1. Framework Selection (Express.js): Express provides the established structure needed for building REST APIs in Node.js. It’s modular and pairs well with middleware for security features.

2. Role-Based Access Control (RBAC): A dedicated Express middleware function (isAuthenticated) is used. It intercepts every protected route, validates the user token, and ensures the user's role matches the required permissions. If not, it immediately sends a 403 Forbidden response.

3. Message Broker Selection (RabbitMQ): RabbitMQ was chosen for its enterprise-grade reliability. Unlike simple queues, RabbitMQ uses Exchanges and Bindings, allowing us granular control over how and where messages are routed. This is ideal for a complex system where different services might need to listen for the same type of event (e.g., an event_updated exchange).

4. Task Delegation:

Publisher (API): When a task is needed (like booking confirmation), the API acts as the Producer, connecting to the RabbitMQ server and publishing a JSON payload to a designated exchange. It immediately sends a success response to the customer.
Consumer (Worker): A separate, constantly running Consumer process connects to RabbitMQ, subscribes to the relevant queue, and listens for messages. Upon receiving a message, it executes the actual business logic (sending email, sending notifications).