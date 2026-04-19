# 🚀 Event Booking System - Setup Guide

This guide will help you get the Event Booking System up and running in just a few minutes.

## Prerequisites

Before you begin, ensure you have the following installed:

| Software | Version | Installation |
|----------|---------|--------------|
| **Docker** | Latest | [Docker Desktop](https://www.docker.com/products/docker-desktop) |
| **Docker Compose** | Latest | Included with Docker Desktop |

## Quick Start (5 Minutes)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd 964-event-booking-system
```

### Step 2: Start Everything with One Command

```bash
docker-compose up --build
```

That's it! Docker will:
- Build the application image
- Start MongoDB
- Start RabbitMQ
- Start the API Server and Worker

### Step 3: Verify Services are Running

Open a new terminal and check:

```bash
docker-compose ps
```

You should see:
```
NAME                    STATUS
event-booking-mongodb   healthy
event-booking-rabbitmq  healthy
event-booking-app       running
```

## Accessing the Application

| Service | URL | Description |
|---------|-----|-------------|
| **API Server** | http://localhost:3001 | REST API endpoints |
| **RabbitMQ UI** | http://localhost:15672 | Message queue management |
| **MongoDB** | localhost:27017 | Database (admin/password123) |

## Testing the API

### 1. Get All Events (Public)

```bash
curl http://localhost:3001/api/events
```

### 2. Create an Event (as Organizer)

```bash
curl -X POST http://localhost:3001/api/events \
  -H "Authorization: Bearer organizer_101" \
  -H "Content-Type: application/json" \
  -d '{"title": "Tech Conference 2026", "description": "Annual tech event", "date": "2026-12-31"}'
```

### 3. Create a Booking (as Customer)

```bash
curl -X POST http://localhost:3001/api/bookings \
  -H "Authorization: Bearer customer_202" \
  -H "Content-Type: application/json" \
  -d '{"eventId": 1, "customerId": 202, "ticketsCount": 2}'
```

### 4. Get Bookings for an Event

```bash
curl http://localhost:3001/api/bookings/1
```

## Available Test Users

| Role | Token | User ID |
|------|-------|---------|
| Organizer | `Bearer organizer_101` | 101 |
| Customer | `Bearer customer_202` | 202 |

## Managing the Application

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f rabbitmq
```

### Stop the Application

```bash
docker-compose down
```

### Restart (without rebuilding)

```bash
docker-compose restart
```

### Rebuild and Restart

```bash
docker-compose up --build
```

## Troubleshooting

### Port 3001 Already in Use

If you get an error about port 3001, stop the other container:

```bash
docker stop <container-using-3001>
```

Or change the port in `docker-compose.yml`:

```yaml
ports:
  - "3002:3001"  # Change to 3002
```

### MongoDB Connection Issues

Wait for MongoDB to be fully healthy:

```bash
docker-compose up -d mongodb
docker-compose ps  # Wait until status is "healthy"
docker-compose up
```

### RabbitMQ Connection Issues

Check RabbitMQ logs:

```bash
docker-compose logs rabbitmq
```

### View Running Containers

```bash
docker-compose ps
```

## Project Structure

```
964-event-booking-system/
├── src/
│   ├── server.js           # Express API Server
│   ├── worker.js           # RabbitMQ Consumer
│   ├── routes/
│   │   ├── bookingRoutes.js
│   │   └── eventRoutes.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── validationMiddleware.js
│   │   └── rateLimitMiddleware.js
│   └── utils/
│       └── rabbitMQ.js
├── docker-compose.yml      # Docker services configuration
├── Dockerfile              # Application container image
├── package.json            # Node.js dependencies
├── .env                    # Environment variables
├── API.md                  # API Documentation
└── SETUP.md                # This file
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   MongoDB    │  │   RabbitMQ   │  │   App (Node.js)  │  │
│  │   :27017     │  │   :5672      │  │  Server + Worker │  │
│  └──────────────┘  └──────────────┘  │     :3001        │  │
│                                       └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

- **MongoDB**: Stores events and bookings
- **RabbitMQ**: Handles async messaging (email notifications)
- **App**: Express API server + Worker process running together

## Need Help?

1. Check the logs: `docker-compose logs -f`
2. Verify containers are running: `docker-compose ps`
3. Restart everything: `docker-compose down && docker-compose up --build`