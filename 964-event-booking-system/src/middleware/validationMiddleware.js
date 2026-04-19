// src/middleware/validationMiddleware.js
const Joi = require('joi');

// Validation schemas
const bookingSchema = Joi.object({
    eventId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Event ID must be a number',
            'number.integer': 'Event ID must be an integer',
            'any.required': 'Event ID is required'
        }),
    customerId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Customer ID must be a number',
            'number.integer': 'Customer ID must be an integer',
            'any.required': 'Customer ID is required'
        }),
    ticketsCount: Joi.number().integer().positive().min(1).required()
        .messages({
            'number.base': 'Tickets count must be a number',
            'number.integer': 'Tickets count must be an integer',
            'number.min': 'Tickets count must be at least 1',
            'any.required': 'Tickets count is required'
        })
});

const eventSchema = Joi.object({
    title: Joi.string().min(3).max(100).required()
        .messages({
            'string.min': 'Title must be at least 3 characters',
            'string.max': 'Title cannot exceed 100 characters',
            'any.required': 'Title is required'
        }),
    description: Joi.string().max(500).optional(),
    date: Joi.date().iso().required()
        .messages({
            'date.iso': 'Date must be a valid ISO date',
            'any.required': 'Date is required'
        })
});

const eventUpdateSchema = Joi.object({
    title: Joi.string().min(3).max(100).optional(),
    description: Joi.string().max(500).optional(),
    date: Joi.date().iso().optional()
}).min(1).messages({
    'object.min': 'At least one field (title, description, or date) must be provided for update'
});

// Middleware factory for validation
const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        return res.status(400).json({
            status: 'Validation Error',
            message: errorMessages
        });
    }
    
    next();
};

module.exports = {
    validateBooking: validate(bookingSchema),
    validateEvent: validate(eventSchema),
    validateEventUpdate: validate(eventUpdateSchema)
};