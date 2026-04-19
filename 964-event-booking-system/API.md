# API Documentation

This document provides detailed information about all available API endpoints, including request/response formats and usage examples.

## Base URL

```
http://localhost:3001
```

## Authentication

The API uses a mock authentication system via the `Authorization` header.

### Header Format

```
Authorization: Bearer <role>_<user_id>
```

### Available Test Tokens

| Role | Token | User ID |
|------|-------|---------|
| Organizer | `Bearer organizer_101` | 101 |
| Customer | `Bearer customer_202` | 202 |
| Guest | (No header) | 0 |

---

## Events API

### 1. Get All Events

Retrieves a list of all events. Public endpoint - no authentication required.

**Endpoint:** `GET /api/events`

**Response:**
```json
{
  "status": "Success",
  "data": [
    {
      "id": 1,
      "title": "Tech Conference 2026",
      "description": "Annual tech event",
      "date": "2026-05-15",
      "organizerId": 101
    }
  ]
}
```

**Example:**
```bash
curl -X GET http://localhost:3001/api/events
```

---

### 2. Create Event

Creates a new event. Requires Organizer role.

**Endpoint:** `POST /api/events`

**Headers:**
```
Authorization: Bearer organizer_101
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Music Festival 2026",
  "description": "Annual open-air music event",
  "date": "2026-07-20"
}
```

**Validation Rules:**
- `title`: Required, string, 3-100 characters
- `description`: Optional, string, max 500 characters
- `date`: Required, ISO 8601 date format (e.g., "2026-07-20")

**Success Response (201):**
```json
{
  "status": "Event created",
  "data": {
    "id": 3,
    "title": "Music Festival 2026",
    "description": "Annual open-air music event",
    "date": "2026-07-20",
    "organizerId": 101
  }
}
```

**Error Response (400):**
```json
{
  "status": "Validation Error",
  "message": "title must be at least 3 characters, date must be a valid ISO date"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/events \
  -H "Authorization: Bearer organizer_101" \
  -H "Content-Type: application/json" \
  -d '{"title": "Music Festival 2026", "description": "Annual music event", "date": "2026-07-20"}'
```

---

### 3. Update Event

Updates an existing event. Requires Organizer role and event ownership.

**Endpoint:** `PUT /api/events/:id`

**Headers:**
```
Authorization: Bearer organizer_101
Content-Type: application/json
```

**Path Parameters:**
- `id`: Event ID (integer)

**Request Body:**
```json
{
  "title": "Updated Event Title",
  "description": "Updated description",
  "date": "2026-08-15"
}
```

**Validation Rules:**
- At least one field must be provided
- All fields follow same rules as Create Event

**Success Response (200):**
```json
{
  "status": "Event updated",
  "message": "Event updated and customer notification dispatched to the queue."
}
```

**Error Responses:**

- **404 - Event not found:**
```json
{
  "status": "Error",
  "message": "Event not found"
}
```

- **403 - Not the owner:**
```json
{
  "status": "Error",
  "message": "Forbidden: You do not have permission to modify this event"
}
```

**Example:**
```bash
curl -X PUT http://localhost:3001/api/events/1 \
  -H "Authorization: Bearer organizer_101" \
  -H "Content-Type: application/json" \
  -d '{"title": "Tech Conference 2026 - Updated", "date": "2026-06-01"}'
```

---

## Bookings API

### 1. Get Bookings for Event

Retrieves all bookings for a specific event. Public endpoint - no authentication required.

**Endpoint:** `GET /api/bookings/:eventId`

**Path Parameters:**
- `eventId`: Event ID (integer)

**Response:**
```json
{
  "status": "Success",
  "data": [
    {
      "id": 1,
      "eventId": 1,
      "customerId": 202,
      "ticketsCount": 2,
      "createdAt": "2026-04-19T06:20:00.000Z"
    }
  ]
}
```

**Example:**
```bash
curl -X GET http://localhost:3001/api/bookings/1
```

---

### 2. Create Booking

Creates a new ticket booking. Requires Customer role.

**Endpoint:** `POST /api/bookings`

**Headers:**
```
Authorization: Bearer customer_202
Content-Type: application/json
```

**Request Body:**
```json
{
  "eventId": 1,
  "customerId": 202,
  "ticketsCount": 2
}
```

**Validation Rules:**
- `eventId`: Required, positive integer
- `customerId`: Required, positive integer
- `ticketsCount`: Required, positive integer (minimum 1)

**Success Response (202):**
```json
{
  "status": "Booking successful",
  "message": "Booking received and confirmation email dispatched to the queue."
}
```

**Error Responses:**

- **400 - Validation Error:**
```json
{
  "status": "Validation Error",
  "message": "ticketsCount must be at least 1"
}
```

- **403 - Not a Customer:**
```json
{
  "status": "Error",
  "message": "Forbidden: Requires Customer role."
}
```

- **500 - Server Error:**
```json
{
  "status": "Error",
  "message": "Failed to process booking: <error message>. Please try again."
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/bookings \
  -H "Authorization: Bearer customer_202" \
  -H "Content-Type: application/json" \
  -d '{"eventId": 1, "customerId": 202, "ticketsCount": 2}'
```

---

## Error Responses

All endpoints may return the following error responses:

### 401 - Unauthorized
```json
{
  "message": "Authentication required."
}
```

### 403 - Forbidden
```json
{
  "message": "Forbidden: Requires Organizer role."
}
```

### 429 - Too Many Requests
```json
{
  "status": "Too Many Requests",
  "message": "Too many requests from this IP, please try again later."
}
```

### 500 - Internal Server Error
```json
{
  "status": "Error",
  "message": "An unexpected error occurred."
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

| Endpoint | Limit |
|----------|-------|
| General API | 100 requests / 15 minutes |
| Bookings | 10 requests / 1 minute |

---

## Background Processing

When you create a booking or update an event, the API:

1. Saves the data to MongoDB
2. Writes a message to an internal outbox
3. Returns a success response immediately
4. A background process publishes the message to RabbitMQ
5. The Worker picks up the message and processes it (sends email/notification)

This ensures the API remains fast and responsive even if the message processing is slow.

---

## Testing with Postman/cURL

### Test as Organizer (Create Event)
```bash
curl -X POST http://localhost:3001/api/events \
  -H "Authorization: Bearer organizer_101" \
  -H "Content-Type: application/json" \
  -d '{"title": "My New Event", "description": "Event description", "date": "2026-12-31"}'
```

### Test as Customer (Create Booking)
```bash
curl -X POST http://localhost:3001/api/bookings \
  -H "Authorization: Bearer customer_202" \
  -H "Content-Type: application/json" \
  -d '{"eventId": 1, "customerId": 202, "ticketsCount": 3}'
```

### Test Unauthorized Access (Try to create event as customer)
```bash
curl -X POST http://localhost:3001/api/events \
  -H "Authorization: Bearer customer_202" \
  -H "Content-Type: application/json" \
  -d '{"title": "Unauthorized Event", "date": "2026-12-31"}'
```

### Test Public Endpoint (No auth)
```bash
curl -X GET http://localhost:3001/api/events
```