// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bookingRoutes = require('./routes/bookingRoutes');
const eventRoutes = require('./routes/eventRoutes');
const { apiLimiter, bookingLimiter } = require('./middleware/rateLimitMiddleware');

const app = express();
const port = process.env.PORT || 3000;

// Middleware setup
app.use(express.json());

// Apply general API rate limiting to all requests
app.use(apiLimiter);

// Mock Auth Middleware (Simulates JWT token reading)
app.use((req, res, next) => {
    // For demonstration, we'll allow the user to pass the token in the header
    const authHeader = req.headers.authorization;
    if (authHeader) {
        // Simple token parsing: 'Bearer <role>_<user_id>'
        const token = authHeader.split(' ')[1];
        let role = 'Customer';
        let userId = 202;

        if (token.includes("organizer")) {
            role = 'Organizer';
            userId = 101;
        } else if (token.includes("customer")) {
            role = 'Customer';
            userId = 202;
        }
        
        req.user = { user_id: userId, role: role, username: `User-${role}` };
    } else {
        req.user = { user_id: 0, role: 'Guest', username: 'Guest' };
    }
    next();
});


// API Routes
app.use('/api/events', eventRoutes);
// Apply stricter rate limiting to booking routes
app.use('/api/bookings', bookingLimiter, bookingRoutes);

// Database Connection & Server Start
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/event_booking?authSource=admin';

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        
        app.listen(port, () => {
            console.log(`🚀 Express API Server running on http://localhost:${port}`);
            console.log("REMINDER: Start 'node src/worker.js' in a separate terminal!");
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB Connection Error:', err.message);
        process.exit(1);
    });
