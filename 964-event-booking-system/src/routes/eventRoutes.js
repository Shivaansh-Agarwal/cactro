// routes/eventRoutes.js
const express = require('express');
const { publishMessage } = require('../utils/rabbitMQ');
const { validateEvent, validateEventUpdate } = require('../middleware/validationMiddleware');
const router = express.Router();

// Simulated Database for Events
const eventsDB = [
    { id: 1, title: 'Tech Conference 2026', description: 'Annual tech event', date: '2026-05-15', organizerId: 101 },
    { id: 2, title: 'Music Festival', description: 'Open air music', date: '2026-06-20', organizerId: 102 }
];

// Simulated Outbox Table
const outbox = [];

// Helper to process outbox messages
async function processOutbox() {
    const pendingMessages = outbox.filter(m => m.status === 'pending');
    for (const msg of pendingMessages) {
        try {
            await publishMessage(msg.exchange, msg.routingKey, msg.payload);
            msg.status = 'published';
            console.log(`[OUTBOX] Message ${msg.id} published successfully.`);
        } catch (error) {
            console.error(`[OUTBOX] Failed to publish message ${msg.id}:`, error.message);
        }
    }
}

// Middleware to check if organizer owns the event
const checkEventOwnership = (req, res, next) => {
    const eventId = parseInt(req.params.id);
    const event = eventsDB.find(e => e.id === eventId);
    
    if (!event) {
        return res.status(404).json({ status: 'Error', message: 'Event not found' });
    }
    
    if (event.organizerId !== req.user.user_id) {
        return res.status(403).json({ 
            status: 'Error', 
            message: 'Forbidden: You do not have permission to modify this event' 
        });
    }
    
    req.event = event; // Attach event to request for downstream use
    next();
};

// GET /events - Public Browsing
router.get('/', (req, res) => {
    res.status(200).json({ status: 'Success', data: eventsDB });
});

// POST /events - Organizer Only
router.post('/', validateEvent, require('../middleware/authMiddleware').isOrganizer, async (req, res) => {
    const { title, description, date } = req.body;
    
    try {
        // Simulate DB save
        const newEvent = {
            id: eventsDB.length + 1,
            title,
            description,
            date,
            organizerId: req.user.user_id
        };
        eventsDB.push(newEvent);
        
        console.log(`[DB] Event created: ${newEvent.id}`);
        
        return res.status(201).json({ 
            status: 'Event created', 
            data: newEvent 
        });
    } catch (error) {
        return res.status(500).json({ 
            status: 'Error', 
            message: `Failed to create event: ${error.message}` 
        });
    }
});

// PUT /events/:id - Organizer Only (with ownership check)
router.put('/:id', validateEventUpdate, require('../middleware/authMiddleware').isOrganizer, checkEventOwnership, async (req, res) => {
    const eventId = parseInt(req.params.id);
    const { title, description, date } = req.body;

    console.log(`\n[API] Organizer ${req.user.username} updating Event ${eventId}.`);

    try {
        // 1. Core Business Logic (Database Update)
        const eventIndex = eventsDB.findIndex(e => e.id === eventId);
        eventsDB[eventIndex] = { 
            ...eventsDB[eventIndex], 
            title: title || eventsDB[eventIndex].title,
            description: description || eventsDB[eventIndex].description,
            date: date || eventsDB[eventIndex].date
        };
        
        // 2. OUTBOX PATTERN: Write to outbox table
        const outboxMessage = {
            id: Date.now().toString(),
            exchange: 'event_events',
            routingKey: 'event.updated',
            payload: { 
                eventId: eventId, 
                newTitle: title || eventsDB[eventIndex].title
            },
            status: 'pending',
            createdAt: new Date()
        };
        outbox.push(outboxMessage);
        console.log(`[DB] Transaction: Event updated and message written to outbox.`);

        // 3. Trigger Background Task: Process outbox
        processOutbox().catch(err => console.error("[OUTBOX] Background processing error:", err));

        return res.status(200).json({ 
            status: "Event updated", 
            message: "Event updated and customer notification dispatched to the queue." 
        });
    } catch (error) {
        return res.status(500).json({ 
            status: "Error", 
            message: `Failed to update event: ${error.message}` 
        });
    }
});

module.exports = router;
