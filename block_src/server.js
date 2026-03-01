require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { generateRequestId, discoverServices } = require('./utils/store');
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
function serveDocs(req, res) {
    try {
        const filePath = path.resolve(__dirname, '../micropay-docs.html');
        let html = fs.readFileSync(filePath, 'utf8');

        // Generate dynamic table of services
        const services = discoverServices();
        let servicesHtml = `
            <div class="section" id="available-services">
              <h2>Available Services</h2>
              <p class="sdesc">Below is a live, up-to-date list of all ${services.length} services currently registered on Micropay Bazaar.</p>
              <div style="overflow-x: auto;">
              <table style="width:100%; text-align:left; border-collapse: collapse; margin-top: 10px;">
                <thead>
                  <tr>
                    <th>Service ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Cost (USD)</th>
                    <th>Ext. Description</th>
                  </tr>
                </thead>
                <tbody>
        `;

        for (const s of services) {
            // Some seed services don't have cost_usd directly, we estimate it via helper in charge routes if we need, but for registry display we can show an estimate if cost_usd is missing.
            const cost = s.cost_usd ? s.cost_usd.toFixed(3) : (s.category === 'AI' ? '0.050' : (s.category === 'Search' || s.category === 'Travel' ? '0.050' : '0.010'));

            servicesHtml += `
                  <tr style="border-bottom: 1px solid rgba(30,37,56,0.5);">
                    <td style="font-family: var(--mono); color: var(--orange); font-size: 11px;">${s.id}</td>
                    <td style="font-weight: 500;">${s.name}</td>
                    <td><span class="badge" style="background: rgba(124,108,250,.1); color: var(--accent); border: 1px solid rgba(124,108,250,.25); font-size: 9px; padding: 2px 6px;">${s.category || 'API'}</span></td>
                    <td style="font-family: var(--mono); font-size: 11px;">$${cost}</td>
                    <td style="color: var(--muted); font-size: 11.5px; line-height: 1.4; padding: 8px 10px;">${s.description}</td>
                  </tr>
            `;
        }
        servicesHtml += `
                </tbody>
              </table>
              </div>
            </div>
            <hr/>
        `;

        // Inject right before "Registry - Services" section
        html = html.replace('<!-- ══════════════════════════════\\n     REGISTRY ENDPOINTS', servicesHtml + '\\n<!-- ══════════════════════════════\\n     REGISTRY ENDPOINTS');

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (err) {
        console.error('Error serving docs:', err);
        res.status(500).send('Error loading documentation.');
    }
}

app.get('/', serveDocs);
app.get('/docs', serveDocs);

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
    console.error(`[Server] Unhandled error: ${err.message} `);
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
    console.log(`\n🚀 Micropay Bazaar API running on port ${PORT} `);
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
