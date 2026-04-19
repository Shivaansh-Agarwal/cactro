// utils/rabbitMQ.js
const amqp = require('amqplib');

const RABBITMQ_URI = process.env.RABBITMQ_URI || 'amqp://localhost';

// Custom error class for RabbitMQ connection failures
class RabbitMQConnectionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RabbitMQConnectionError';
    }
}

// Connects to RabbitMQ and returns the main connection object
async function connect() {
    try {
        const connection = await amqp.connect(RABBITMQ_URI);
        return connection;
    } catch (error) {
        throw new RabbitMQConnectionError(`Could not connect to RabbitMQ: ${error.message}`);
    }
}

// Publishes a message to a specified exchange
async function publishMessage(exchangeName, routingKey, payload) {
    const connection = await connect();
    const channel = await connection.createChannel();

    // 1. Ensure the exchange exists (Fanout or Topic recommended)
    await channel.assertExchange(exchangeName, 'topic', { durable: true });
    
    // 2. Publish the message using the routing key
    const messageBody = JSON.stringify(payload);
    channel.publish(exchangeName, routingKey, Buffer.from(messageBody), { 
        persistent: true 
    });

    console.log(`[PUBLISHER] Successfully published message to Exchange '${exchangeName}' with key '${routingKey}'.`);

    await channel.close();
    await connection.close();
}

module.exports = { publishMessage, RabbitMQConnectionError };
