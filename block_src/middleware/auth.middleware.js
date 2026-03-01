/**
 * Middleware to verify Bearer API Key against allowed keys in ENV.
 */
function verifyApiKey(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: {
                    type: 'authentication_error',
                    message: "Missing or invalid Authorization header. Expected format: 'Bearer <api_key>'.",
                    request_id: req.requestId || null,
                },
            });
        }

        const token = authHeader.split(' ')[1];

        // Parse allowed keys from CSV string in env
        const allowedKeysString = process.env.ALLOWED_API_KEYS || '';
        const allowedKeys = allowedKeysString.split(',').map(key => key.trim());

        if (!allowedKeys.includes(token)) {
            return res.status(401).json({
                error: {
                    type: 'authentication_error',
                    message: 'Invalid API key provided.',
                    request_id: req.requestId || null,
                },
            });
        }

        next();
    } catch (error) {
        console.error(`[Auth Middleware] Error checking API key: ${error.message}`);
        return res.status(500).json({
            error: {
                type: 'api_error',
                message: 'An internal error occurred during authentication.',
                request_id: req.requestId || null,
            },
        });
    }
}

module.exports = {
    verifyApiKey,
};
