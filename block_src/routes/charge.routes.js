const express = require('express');
const router = express.Router();
const { verifyApiKey } = require('../middleware/auth.middleware');
const { getSolPriceInUsd } = require('../services/price.service');
const { buildUnsignedTransaction } = require('../services/solana.service');
const {
    createCharge,
    getChargeById,
    listCharges,
    getServiceById,
    getIdempotencyResult,
    setIdempotencyResult,
} = require('../utils/store');

// ─────────────────────────────────────────
// GET /api/v1/charges
// List charges with optional filtering & pagination (auth required)
// NOTE: Defined BEFORE /:id to prevent Express treating "list" etc. as an id
// ─────────────────────────────────────────
router.get('/', verifyApiKey, (req, res) => {
    let { limit = '10', offset = '0', status, source_wallet } = req.query;

    const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 10), 100);
    const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

    const result = listCharges({
        limit: parsedLimit,
        offset: parsedOffset,
        status,
        source_wallet,
    });

    return res.status(200).json({
        object: 'list',
        ...result,
    });
});

// ─────────────────────────────────────────
// POST /api/v1/charges
// Create a new charge with dynamic amount_usd (auth required)
// ─────────────────────────────────────────
router.post('/', verifyApiKey, async (req, res) => {
    const idempotencyKey = req.headers['idempotency-key'];

    // Step 1: Idempotency check — return cached response immediately
    if (idempotencyKey) {
        const cached = getIdempotencyResult(idempotencyKey);
        if (cached) {
            res.setHeader('Idempotency-Replayed', 'true');
            return res.status(200).json(cached);
        }
    }

    // Step 2: Validate inputs
    const { service_id, source_wallet, amount_usd } = req.body;

    if (!service_id || typeof service_id !== 'string' || service_id.trim() === '') {
        return res.status(400).json({
            error: {
                type: 'invalid_request_error',
                message: "'service_id' is required and must be a non-empty string.",
            },
        });
    }
    if (!source_wallet || typeof source_wallet !== 'string' || source_wallet.trim() === '') {
        return res.status(400).json({
            error: {
                type: 'invalid_request_error',
                message: "'source_wallet' is required and must be a non-empty string.",
            },
        });
    }
    if (amount_usd === undefined || amount_usd === null) {
        return res.status(400).json({
            error: {
                type: 'invalid_request_error',
                message: "'amount_usd' is required.",
            },
        });
    }
    if (typeof amount_usd !== 'number') {
        return res.status(400).json({
            error: {
                type: 'invalid_request_error',
                message: "'amount_usd' must be a number.",
            },
        });
    }
    if (amount_usd <= 0) {
        return res.status(400).json({
            error: {
                type: 'invalid_request_error',
                message: "'amount_usd' must be greater than 0.",
            },
        });
    }
    if (amount_usd > 100) {
        return res.status(400).json({
            error: {
                type: 'invalid_request_error',
                message: "'amount_usd' must not exceed $100.00 (safety cap).",
            },
        });
    }

    // Step 3: Look up the service to get developer_wallet and name
    const service = getServiceById(service_id.trim());
    if (!service) {
        return res.status(404).json({
            error: {
                type: 'not_found_error',
                message: `Service '${service_id}' not found in registry.`,
            },
        });
    }

    // Step 4: Fetch live SOL price
    const solPrice = await getSolPriceInUsd();
    if (!solPrice || solPrice <= 0) {
        return res.status(500).json({
            error: {
                type: 'api_error',
                message: 'Unable to fetch current SOL price. Please retry.',
            },
        });
    }

    // Step 5: Calculate SOL amount from the request's amount_usd
    const amount_sol = parseFloat((amount_usd / solPrice).toFixed(9));
    if (amount_sol <= 0) {
        return res.status(400).json({
            error: {
                type: 'invalid_request_error',
                message: 'Calculated SOL amount is too small to process.',
            },
        });
    }

    // Step 6: Build the unsigned Solana transaction
    let transaction_payload;
    try {
        transaction_payload = await buildUnsignedTransaction(
            source_wallet.trim(),
            service.developer_wallet,
            amount_sol
        );
    } catch (error) {
        return res.status(500).json({
            error: {
                type: 'api_error',
                message: 'Failed to construct transaction. Please verify wallet addresses.',
            },
        });
    }

    // Step 7: Build and store the charge object
    const charge = createCharge({
        status: 'requires_signature',
        service_id: service.id,
        service_name: service.name,
        amount_usd,
        exchange_rate_sol_usd: solPrice,
        amount_sol,
        network_fee_sol: 0.000005,
        source_wallet: source_wallet.trim(),
        destination_wallet: service.developer_wallet,
        transaction_payload,
    });

    // Step 8: Cache idempotency result if key was provided
    if (idempotencyKey) {
        setIdempotencyResult(idempotencyKey, charge);
    }

    // Step 9: Return the charge
    return res.status(200).json(charge);
});

// ─────────────────────────────────────────
// GET /api/v1/charges/:id
// Get a single charge by ID (auth required)
// ─────────────────────────────────────────
router.get('/:id', verifyApiKey, (req, res) => {
    const { id } = req.params;
    const charge = getChargeById(id);
    if (!charge) {
        return res.status(404).json({
            error: {
                type: 'not_found_error',
                message: `Charge '${id}' not found.`,
            },
        });
    }
    return res.status(200).json(charge);
});

module.exports = router;
