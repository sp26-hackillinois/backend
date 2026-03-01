const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

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
// Swagger UI — interactive API documentation
// ─────────────────────────────────────────
const swaggerUiOptions = {
    customSiteTitle: 'Micropay Bazaar API',
    customCss: `
        .swagger-ui .topbar { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); }
        .swagger-ui .topbar .download-url-wrapper { display: none; }
        .swagger-ui .info h2.title { color: #e94560; }
        .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #e94560; }
        .swagger-ui .btn.authorize { border-color: #e94560; color: #e94560; }
        .swagger-ui .btn.authorize svg { fill: #e94560; }
    `,
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
app.get('/api-docs.json', (req, res) => { res.setHeader('Content-Type', 'application/json'); res.send(swaggerSpec); });

// Redirect root to docs
app.get('/', (req, res) => res.redirect('/api-docs'));

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
    console.log(`\n📖 Swagger UI:  http://localhost:${PORT}/api-docs`);
    console.log(`📄 OpenAPI JSON: http://localhost:${PORT}/api-docs.json`);
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
