const express = require('express');
const router = express.Router();
const { verifyApiKey } = require('../middleware/auth.middleware');
const {
    registerService,
    getServiceById,
    discoverServices,
} = require('../utils/store');

// ─────────────────────────────────────────
// POST /api/v1/registry/register
// Register a new paid API service (auth required)
// ─────────────────────────────────────────
router.post('/register', verifyApiKey, (req, res) => {
    const { name, description, endpoint, cost_usd, developer_wallet } = req.body;

    // Validate all required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({
            error: {
                type: 'invalid_request_error',
                message: "'name' is required and must be a non-empty string.",
            },
        });
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
        return res.status(400).json({
            error: {
                type: 'invalid_request_error',
                message: "'description' is required and must be a non-empty string.",
            },
        });
    }
    if (!endpoint || typeof endpoint !== 'string' || endpoint.trim() === '') {
        return res.status(400).json({
            error: {
                type: 'invalid_request_error',
                message: "'endpoint' is required and must be a non-empty string.",
            },
        });
    }
    if (cost_usd === undefined || cost_usd === null || typeof cost_usd !== 'number' || cost_usd <= 0) {
        return res.status(400).json({
            error: {
                type: 'invalid_request_error',
                message: "'cost_usd' is required and must be a positive number.",
            },
        });
    }
    if (!developer_wallet || typeof developer_wallet !== 'string' || developer_wallet.trim() === '') {
        return res.status(400).json({
            error: {
                type: 'invalid_request_error',
                message: "'developer_wallet' is required and must be a non-empty string.",
            },
        });
    }

    const service = registerService({
        name: name.trim(),
        description: description.trim(),
        endpoint: endpoint.trim(),
        cost_usd,
        developer_wallet: developer_wallet.trim(),
    });

    return res.status(201).json(service);
});

// ─────────────────────────────────────────
// GET /api/v1/registry/discover
// Discover registered services (public — no auth)
// ─────────────────────────────────────────
router.get('/discover', (req, res) => {
    const { query } = req.query;
    const services = discoverServices(query);
    return res.status(200).json({
        object: 'list',
        data: services,
        total_count: services.length,
    });
});

// ─────────────────────────────────────────
// GET /api/v1/registry/services/:id
// Get a single service by ID (public — no auth)
// ─────────────────────────────────────────
router.get('/services/:id', (req, res) => {
    const { id } = req.params;
    const service = getServiceById(id);
    if (!service) {
        return res.status(404).json({
            error: {
                type: 'not_found_error',
                message: `Service '${id}' not found.`,
            },
        });
    }
    return res.status(200).json(service);
});

module.exports = router;
