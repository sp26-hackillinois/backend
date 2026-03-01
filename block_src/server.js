require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { generateRequestId } = require('./utils/store');
const registryRoutes = require('./routes/registry.routes');
const chargeRoutes = require('./routes/charge.routes');
const networkRoutes = require('./routes/network.routes');
const chatRoutes = require('./routes/chat.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();

// ─────────────────────────────────────────
// Core Middleware
// ─────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Attach a unique request ID to each incoming request
app.use((req, res, next) => {
    const requestId = generateRequestId();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
});

// ─────────────────────────────────────────
// Documentation Webpage
// ─────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../micropay-docs.html'));
});
app.get('/docs', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../micropay-docs.html'));
});

// ─────────────────────────────────────────
// Routes
// ─────────────────────────────────────────
app.use('/api/v1/registry', registryRoutes);
app.use('/api/v1/charges', chargeRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/v1', networkRoutes);

// ─────────────────────────────────────────
// 404 Handler (unknown routes)
// ─────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        error: {
            type: 'not_found_error',
            message: `Route '${req.method} ${req.originalUrl}' not found.`,
            request_id: req.requestId,
        },
    });
});

// ─────────────────────────────────────────
// Global Error Handler (must be last middleware)
// ─────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(`[Server] Unhandled error: ${err.message}`);
    res.status(500).json({
        error: {
            type: 'api_error',
            message: 'An unexpected error occurred.',
            request_id: req.requestId,
        },
    });
});

// ─────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Micropay Bazaar API running on port ${PORT}`);
    console.log(`\n📖 Documentation: http://localhost:${PORT}/docs`);
    console.log(`\n   Endpoints:`);
    console.log(`     GET  http://localhost:${PORT}/api/v1/health`);
    console.log(`     GET  http://localhost:${PORT}/api/v1/network/status`);
    console.log(`     POST http://localhost:${PORT}/api/v1/registry/register`);
    console.log(`     GET  http://localhost:${PORT}/api/v1/registry/discover`);
    console.log(`     GET  http://localhost:${PORT}/api/v1/registry/services/:id`);
    console.log(`     POST http://localhost:${PORT}/api/v1/charges`);
    console.log(`     GET  http://localhost:${PORT}/api/v1/charges`);
    console.log(`     GET  http://localhost:${PORT}/api/v1/charges/:id`);
    console.log(`     GET  http://localhost:${PORT}/api/v1/balance/:wallet`);
    console.log(`     POST http://localhost:${PORT}/api/v1/chat/completions`);
    console.log(`     POST http://localhost:${PORT}/api/v1/chat/tool-result`);
    console.log(`     POST http://localhost:${PORT}/api/ai/chat\n`);
});

module.exports = app;
