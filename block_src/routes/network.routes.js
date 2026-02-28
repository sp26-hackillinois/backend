const express = require('express');
const router = express.Router();
const { verifyApiKey } = require('../middleware/auth.middleware');
const { getWalletBalance, getNetworkStatus } = require('../services/network.service');

// ─────────────────────────────────────────
// GET /api/v1/health
// Health check (public — no auth)
// ─────────────────────────────────────────
router.get('/health', (req, res) => {
    return res.status(200).json({
        status: 'ok',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});

// ─────────────────────────────────────────
// GET /api/v1/balance/:wallet
// Get SOL balance for a wallet address (auth required)
// ─────────────────────────────────────────
router.get('/balance/:wallet', verifyApiKey, async (req, res) => {
    const { wallet } = req.params;
    try {
        const balanceInfo = await getWalletBalance(wallet);
        return res.status(200).json(balanceInfo);
    } catch (error) {
        // PublicKey constructor throws for invalid addresses
        return res.status(400).json({
            error: {
                type: 'invalid_request_error',
                message: 'Invalid Solana wallet address.',
            },
        });
    }
});

// ─────────────────────────────────────────
// GET /api/v1/network/status
// Get Solana Devnet network status (public — no auth)
// ─────────────────────────────────────────
router.get('/network/status', async (req, res) => {
    const status = await getNetworkStatus();
    return res.status(200).json(status);
});

module.exports = router;
