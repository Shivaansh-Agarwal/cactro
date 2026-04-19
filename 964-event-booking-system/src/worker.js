// worker.js
require('dotenv').config();
const amqp = require('amqplib');

const RABBITMQ_URI = process.env.RABBITMQ_URI || 'amqp://localhost';

// Simulated database to track processed messages (for idempotency)
const processedMessages = new Set();

// Global Connection Setup with Reconnection Logic
async function connectRabbitMQ(retries = 5, delay = 3000) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`[WORKER] Attempting to connect to RabbitMQ (attempt ${i + 1}/${retries})...`);
            const connection = await amqp.connect(RABBITMQ_URI);
            
            // Handle connection close events for reconnection
            connection.on('close', () => {
                console.error("[WORKER] Connection closed. Attempting to reconnect...");
                setTimeout(() => connectRabbitMQ(), delay);
            });
            
            connection.on('error', (err) => {
                console.error("[WORKER] Connection error:", err.message);
            });
            
            console.log("[WORKER] Successfully connected to RabbitMQ.");
            return connection;
        } catch (error) {
            console.error(`[WORKER] Connection attempt ${i + 1} failed:`, error.message);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    console.error("[WORKER] FATAL: Could not connect to RabbitMQ after multiple attempts.");
    process.exit(1);
}

// Helper to check if message was already processed (Idempotency)
function isMessageProcessed(messageId) {
    return processedMessages.has(messageId);
}

// Helper to mark message as processed
function markMessageProcessed(messageId) {
    processedMessages.add(messageId);
    // Keep set size manageable (remove old entries if > 10000)
    if (processedMessages.size > 10000) {
        const iterator = processedMessages.values();
        processedMessages.delete(iterator.next().value);
    }
}

// Task 1: Booking Confirmation Email
async function setupBookingConsumer(connection) {
    const channel = await connection.createChannel();
    const exchange = 'event_events';
    const queueName = 'booking_confirmations';
    
    // Declare Exchange and Queue
    await channel.assertExchange(exchange, 'topic', { durable: true });
    await channel.assertQueue(queueName, { durable: true, exclusive: false, autoDelete: false });
    
    // Bind Queue to Exchange (Routing Key 'booking')
    await channel.bindQueue(queueName, exchange, 'booking');
    
    // Consume messages
    await channel.consume(queueName, async (msg) => {
        if (msg !== null) {
            const payload = JSON.parse(msg.content.toString());
            const messageId = `booking_${payload.eventId}_${payload.customerId}_${payload.ticketsCount}`;
            
            try {
                // IDEMPOTENCY CHECK: Skip if already processed
                if (isMessageProcessed(messageId)) {
                    console.log(`[WORKER] Skipping duplicate message: ${messageId}`);
                    channel.ack(msg);
                    return;
                }
                
                console.log(`\n================================================================`);
                console.log(`📧 [CONSUMER WORKER: EMAIL] Starting Confirmation for Event ${payload.eventId}`);
                
                // Simulate processing (e.g., sending email)
                await new Promise(resolve => setTimeout(resolve, 2000)); 
                
                console.log(`   SUCCESS: Email sent to Customer ${payload.customerId} for ${payload.ticketsCount} tickets.`);
                console.log(`================================================================\n`);
                
                // Mark as processed before acknowledging
                markMessageProcessed(messageId);
                channel.ack(msg); 
                
            } catch (error) {
                console.error(`[WORKER] Error processing booking message:`, error.message);
                // Do NOT acknowledge the message - it will be redelivered
                // In production, consider using channel.nack(msg, false, true) to requeue
                // or send to a Dead Letter Queue after max retries
                channel.nack(msg, false, true); 
            }
        }
    });
    console.log("✅ RabbitMQ Worker running for Booking Confirmations.");
}


// Task 2: Event Update Notification
async function setupNotificationConsumer(connection) {
    const channel = await connection.createChannel();
    const exchange = 'event_events';
    const queueName = 'event_notifications';
    
    // Declare Exchange and Queue
    await channel.assertExchange(exchange, 'topic', { durable: true });
    await channel.assertQueue(queueName, { durable: true, exclusive: false, autoDelete: false });
    
    // Bind Queue to Exchange (Routing Key 'event.updated')
    await channel.bindQueue(queueName, exchange, 'event.updated');
    
    // Consume messages
    await channel.consume(queueName, async (msg) => {
        if (msg !== null) {
            const payload = JSON.parse(msg.content.toString());
            const messageId = `event_update_${payload.eventId}_${payload.newTitle}`;
            
            try {
                // IDEMPOTENCY CHECK
                if (isMessageProcessed(messageId)) {
                    console.log(`[WORKER] Skipping duplicate message: ${messageId}`);
                    channel.ack(msg);
                    return;
                }
                
                console.log(`\n===================================================================`);
                console.log(`📢 [CONSUMER WORKER: NOTIFICATION] Starting Update for Event ${payload.eventId}`);
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                console.log(`   SUCCESS: Notification sent to 4 registered customers.`);
                console.log(`   Event "${payload.newTitle}" has been updated.`);
                console.log(`===================================================================\n`);
                
                markMessageProcessed(messageId);
                channel.ack(msg);
                
            } catch (error) {
                console.error(`[WORKER] Error processing notification message:`, error.message);
                channel.nack(msg, false, true);
            }
        }
    });
    console.log("✅ RabbitMQ Worker running for Event Notifications.");
}

// Main worker startup function
async function startWorkers() {
    const connection = await connectRabbitMQ();
    await setupBookingConsumer(connection);
    await setupNotificationConsumer(connection);
    console.log("✅ All RabbitMQ Consumers initialized and listening.");
}

startWorkers();

