/**
 * Middleware to verify Bearer API Key against a hardcoded array in ENV.
 */
function verifyApiKey(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header format' });
        }

        const token = authHeader.split(' ')[1];

        // Parse allowed keys from CSV string in env
        const allowedKeysString = process.env.ALLOWED_API_KEYS || '';
        const allowedKeys = allowedKeysString.split(',').map(key => key.trim());

        if (!allowedKeys.includes(token)) {
            return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
        }

        next();
    } catch (error) {
        console.error(`[Auth Middleware] Error checking API key: ${error.message}`);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = {
    verifyApiKey
};
