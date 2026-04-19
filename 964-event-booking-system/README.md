# Event Booking System

A Node.js REST API for event management with MongoDB and RabbitMQ.

## Requirements

### Problem Statement
Build an event booking system where event organizers can create/manage events and customers can book tickets. The system must handle concurrent bookings reliably and process booking confirmations asynchronously.

## Design Decisions

### Functional Requirements
- **Event Management**: Organizers can create, update, and list events
- **Booking System**: Customers can book tickets for events
- **Role-Based Access**: Different permissions for Organizer vs Customer roles
- **Async Processing**: Booking confirmations processed via message queue

### Non-Functional Requirements
- **Reliability**: Ensure data consistency using outbox pattern for reliable message delivery
- **Scalability**: Worker handles async tasks independently, API remains non-blocking
- **Security**: JWT-based authentication with role validation
- **Idempotency**: Prevent duplicate message consumption

### Architecture Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Framework** | Express.js | Modular middleware for security & validation |
| **Database** | MongoDB | Flexible schema for evolving data models |
| **Message Broker** | RabbitMQ | Enterprise-grade with Exchanges/Bindings |
| **Auth** | JWT Tokens | Stateless, role-encoded tokens |
| **Pattern** | Outbox | Atomic DB commit + message publish |
| **Consumer** | Idempotent | Track processed messages to handle duplicates |

### Technical Stack
- Node.js 18+
- Docker & Docker Compose
- MongoDB (via Docker)
- RabbitMQ (via Docker)

## Data Schema

### Event
| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Unique identifier |
| `title` | String | Event name |
| `description` | String | Event details |
| `date` | String | Event date (YYYY-MM-DD) |
| `organizerId` | Integer | Owner of the event |

### Booking
| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Unique identifier |
| `eventId` | Integer | Reference to event |
| `customerId` | Integer | Customer who booked |
| `ticketsCount` | Integer | Number of tickets |
| `createdAt` | DateTime | Booking timestamp |

### Outbox (Message Queue)
| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique message ID |
| `exchange` | String | RabbitMQ exchange |
| `routingKey` | String | Message routing key |
| `payload` | Object | Message content |
| `status` | String | pending / published |
| `createdAt` | DateTime | Message creation time |

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
|---------|----------|------|-------------|
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
```