const express = require('express');
const router = express.Router();
const { verifyApiKey } = require('../middleware/auth.middleware');
const { getServiceById, createCharge, getChargeById, listCharges, getIdempotencyResult, setIdempotencyResult } = require('../utils/store');
const { getSolPriceInUsd } = require('../services/price.service');
const { buildUnsignedTransaction } = require('../services/solana.service');
const { Connection, PublicKey } = require('@solana/web3.js');

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const DEVELOPER_WALLET = process.env.AI_DEVELOPER_WALLET || '2Hn6ESeMRqfVDTptanXgK6vDEpgJGnp4rG6Ls3dzszv8';

const NETWORK_FEE_SOL = 0.000005;

const CATEGORY_COST_USD = {
    Weather: 0.01,
    Finance: 0.01,
    NLP: 0.01,
    Food: 0.01,
    Blockchain: 0.01,
    News: 0.02,
    Sports: 0.02,
    Data: 0.02,
    Search: 0.05,
    Travel: 0.05,
    AI: 0.05,
};
const DEFAULT_COST_USD = 0.01;

function estimatedCost(service) {
    if (service.id === 'openai_chat') return 0.05;
    return CATEGORY_COST_USD[service.category] ?? DEFAULT_COST_USD;
}

// ─────────────────────────────────────────
// POST /api/v1/charges
// ─────────────────────────────────────────
router.post('/', verifyApiKey, async (req, res) => {
    try {
        const { service_id, source_wallet } = req.body;

        // Idempotency
        const idempotencyKey = req.headers['idempotency-key'];
        if (idempotencyKey) {
            const cached = getIdempotencyResult(idempotencyKey);
            if (cached) {
                res.setHeader('Idempotency-Replayed', 'true');
                return res.status(200).json(cached);
            }
        }

        // Validate
        if (!service_id || typeof service_id !== 'string' || service_id.trim() === '') {
            return res.status(400).json({
                error: { type: 'invalid_request_error', message: "'service_id' is required and must be a non-empty string." }
            });
        }
        if (!source_wallet || typeof source_wallet !== 'string' || source_wallet.trim() === '') {
            return res.status(400).json({
                error: { type: 'invalid_request_error', message: "'source_wallet' is required and must be a non-empty string." }
            });
        }

        // Look up service
        const service = getServiceById(service_id.trim());
        if (!service) {
            return res.status(404).json({
                error: { type: 'not_found_error', message: `Service '${service_id}' not found in registry.` }
            });
        }

        const destinationWallet = service.developer_wallet;
        const amountUsd = estimatedCost(service);

        // Live SOL price
        const solPriceUsd = await getSolPriceInUsd();
        const amountSol = Number((amountUsd / solPriceUsd).toFixed(9));

        // Build unsigned transaction
        const transactionPayload = await buildUnsignedTransaction(
            source_wallet.trim(),
            destinationWallet,
            amountSol
        );

        // Persist
        const charge = createCharge({
            status: 'requires_signature',
            service_id: service.id,
            service_name: service.name,
            amount_usd: amountUsd,
            exchange_rate_sol_usd: solPriceUsd,
            amount_sol: amountSol,
            network_fee_sol: NETWORK_FEE_SOL,
            source_wallet: source_wallet.trim(),
            destination_wallet: destinationWallet,
            transaction_payload: transactionPayload,
        });

        if (idempotencyKey) setIdempotencyResult(idempotencyKey, charge);
        return res.status(200).json(charge);

    } catch (error) {
        console.error(`[Charge] Error: ${error.message}`);
        return res.status(500).json({
            error: { type: 'api_error', message: error.message || 'Internal Server Error' }
        });
    }
});

// ─────────────────────────────────────────
// GET /api/v1/charges/count
// Returns total on-chain transaction count for the developer wallet (public — no auth)
// ─────────────────────────────────────────
router.get('/count', async (req, res) => {
    try {
        const pubkey = new PublicKey(DEVELOPER_WALLET);
        // Fetch up to 1000 signatures; Solana RPC max is 1000 per call
        const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 1000 });
        return res.status(200).json({ count: signatures.length });
    } catch (error) {
        console.error('[Charges/Count] RPC error:', error.message);
        return res.status(500).json({
            error: { type: 'api_error', message: 'Failed to fetch transaction count from Solana RPC.' }
        });
    }
});

// ─────────────────────────────────────────
// GET /api/v1/charges
// ─────────────────────────────────────────
router.get('/', verifyApiKey, (req, res) => {
    const { limit, offset, status, source_wallet } = req.query;
    const result = listCharges({
        limit: limit ? parseInt(limit) : 10,
        offset: offset ? parseInt(offset) : 0,
        status,
        source_wallet,
    });
    return res.status(200).json({ object: 'list', ...result });
});

// ─────────────────────────────────────────
// GET /api/v1/charges/:id
// ─────────────────────────────────────────
router.get('/:id', verifyApiKey, (req, res) => {
    const charge = getChargeById(req.params.id);
    if (!charge) {
        return res.status(404).json({
            error: { type: 'not_found_error', message: `Charge '${req.params.id}' not found.` }
        });
    }
    return res.status(200).json(charge);
});

module.exports = router;
