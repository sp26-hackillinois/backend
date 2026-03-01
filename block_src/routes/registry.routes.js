const express = require('express');
const router = express.Router();
const { verifyApiKey } = require('../middleware/auth.middleware');
const { registerService, getServiceById, discoverServices, deleteService } = require('../utils/store');

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
    const { query, category, limit, offset } = req.query;

    let services = discoverServices(query);

    if (category && typeof category === 'string' && category.trim() !== '') {
        const cat = category.trim().toLowerCase();
        services = services.filter(s =>
            s.category && s.category.toLowerCase() === cat
        );
    }

    const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 50), 100);
    const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);
    const total_count = services.length;
    const data = services.slice(parsedOffset, parsedOffset + parsedLimit);
    const has_more = parsedOffset + parsedLimit < total_count;

    return res.status(200).json({
        object: 'list',
        data,
        total_count,
        has_more,
        limit: parsedLimit,
        offset: parsedOffset,
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

// ─────────────────────────────────────────
// DELETE /api/v1/registry/services/:id
// Delete a registered service (auth required)
// ─────────────────────────────────────────
router.delete('/services/:id', verifyApiKey, (req, res) => {
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
    deleteService(id);
    return res.status(200).json({
        id,
        object: 'service',
        deleted: true,
    });
});

module.exports = router;
