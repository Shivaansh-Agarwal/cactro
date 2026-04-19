// routes/bookingRoutes.js (IMPROVED)
const express = require('express');
const { publishMessage } = require('../utils/rabbitMQ');
const { validateBooking } = require('../middleware/validationMiddleware');
const router = express.Router();

// Simulated Database for Bookings
const bookingsDB = [];

// Simulated Outbox Table (In production, this would be a real database table)
// The outbox pattern ensures atomicity: DB commit + message write happen together
const outbox = []; 

// Helper to process outbox messages (simulates the background outbox processor)
async function processOutbox() {
    const pendingMessages = outbox.filter(m => m.status === 'pending');
    for (const msg of pendingMessages) {
        try {
            await publishMessage(msg.exchange, msg.routingKey, msg.payload);
            msg.status = 'published';
            console.log(`[OUTBOX] Message ${msg.id} published successfully.`);
        } catch (error) {
            console.error(`[OUTBOX] Failed to publish message ${msg.id}:`, error.message);
            // In production, implement retry logic or move to dead letter queue
        }
    }
}

// GET /bookings/:eventId - Get all bookings for a specific event (Public)
router.get('/:eventId', (req, res) => {
    const eventId = parseInt(req.params.eventId);
    
    if (isNaN(eventId)) {
        return res.status(400).json({ 
            status: 'Error', 
            message: 'Invalid event ID' 
        });
    }
    
    const eventBookings = bookingsDB.filter(b => b.eventId === eventId);
    
    return res.status(200).json({ 
        status: 'Success', 
        data: eventBookings 
    });
});

router.post('/', validateBooking, require('../middleware/authMiddleware').isCustomer, async (req, res) => {
    const { eventId, customerId, ticketsCount } = req.body;
    
    try {
        console.log(`\n[API] Customer ${req.user.username} attempting to book tickets.`);

        // 1. START TRANSACTION BLOCK
        // Ideally, all operations from here must succeed together.
        
        // A. Synchronous Logic: Save to DB (This is the commit point for the booking)
        // This simulates checking inventory, creating the ticket records, and committing the DB transaction.
        console.log(`[DB] Transaction Start: Saving ${ticketsCount} tickets for Event ${eventId}...`);
        // --- Simulated DB Save ---
        // await mongoose.Model.create({...}); 

        
        // 2. OUTBOX PATTERN: Write to outbox table (within the same transaction)
        // This guarantees that if the DB commit succeeds, the message WILL eventually be sent.
        const outboxMessage = {
            id: Date.now().toString(),
            exchange: 'event_events',
            routingKey: 'booking',
            payload: { 
                eventId: eventId, 
                customerId: customerId, 
                ticketsCount: ticketsCount 
            },
            status: 'pending',
            createdAt: new Date()
        };
        outbox.push(outboxMessage);
        console.log(`[DB] Transaction: Message written to outbox table.`);

        // 3. COMMIT TRANSACTION BLOCK
        console.log("[DB] Transaction Success: Booking committed and outbox message saved.");
        
        // Save booking to simulated database
        const newBooking = {
            id: bookingsDB.length + 1,
            eventId,
            customerId,
            ticketsCount,
            createdAt: new Date()
        };
        bookingsDB.push(newBooking);
        console.log(`[DB] Booking saved: ID ${newBooking.id}`);

        // 4. Trigger Background Task: Process outbox (in real app, this is a separate worker)
        // We do this asynchronously so the API responds quickly
        processOutbox().catch(err => console.error("[OUTBOX] Background processing error:", err));

        // Successful response
        return res.status(202).json({ 
            status: "Booking successful", 
            message: "Booking received and confirmation email dispatched to the queue." 
        });
        
    } catch (error) {
        // If ANY step fails (DB error, RabbitMQ connection error, validation error), 
        // we catch it, and in a real system, we would ROLLBACK the transaction.
        console.error("\n[ERROR] CRITICAL Booking Failure:", error.message);
        
        // Sending a 400 (Bad Request) or 500 (Internal Server Error) is appropriate.
        return res.status(500).json({ 
            status: "Error", 
            message: `Failed to process booking: ${error.message}. Please try again.` 
        });
    }
});

module.exports = router;
