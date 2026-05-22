/**
 * Global error handling middleware
 * Catches all errors and returns formatted JSON response
 */
export const errorHandler = (err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
    });

    // Default to 500
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Handle specific error types
    let response = {
        error: message,
        status,
    };

    // Add details for development (could be removed for production)
    if (process.env.NODE_ENV !== 'production') {
        response.details = err.stack;
    }

    // Handle database errors
    if (err.code && err.code.startsWith('ER_')) {
        response.error = 'Database error';
        if (err.code === 'ER_DUP_ENTRY') {
            response.error = 'Duplicate entry';
            response.status = 409;
        }
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        response.error = 'Invalid token';
        response.status = 401;
    }

    if (err.name === 'TokenExpiredError') {
        response.error = 'Token expired';
        response.status = 401;
    }

    // Handle OpenAI errors
    if (err.code === 'insufficient_quota') {
        response.error = 'OpenAI quota exceeded. Please try again later.';
        response.status = 429;
    }

    if (err.code === 'model_not_found') {
        response.error = 'AI model not available. Using fallback.';
        response.status = 503;
    }

    // Handle GitHub API rate limit
    if (err.message && err.message.includes('rate limit')) {
        response.error = 'GitHub API rate limit exceeded. Please try again later.';
        response.status = 429;
    }

    res.status(response.status).json(response);
};

/**
 * 404 handler
 */
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
    });
};
