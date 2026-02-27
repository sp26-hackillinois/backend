const express = require('express');
const router = express.Router();
const { getSolPriceInUsd } = require('../services/price.service');
const { buildUnsignedTransaction } = require('../services/solana.service');

// POST /v1/charges
router.post('/', async (req, res) => {
    try {
        const { amount_usd, source_wallet, destination_wallet } = req.body;

        // 1. Validate inputs
        if (!amount_usd || typeof amount_usd !== 'number' || amount_usd <= 0) {
            return res.status(400).json({ error: 'Invalid amount_usd. Must be a positive number.' });
        }

        if (!source_wallet || typeof source_wallet !== 'string') {
            return res.status(400).json({ error: 'Invalid source_wallet. Must be a valid Base58 public key string.' });
        }

        if (!destination_wallet || typeof destination_wallet !== 'string') {
            return res.status(400).json({ error: 'Invalid destination_wallet. Must be a valid Base58 public key string.' });
        }

        // 2. Fetch current SOL price
        const solPrice = await getSolPriceInUsd();
        if (!solPrice || solPrice <= 0) {
            throw new Error('Failed to determine SOL price.');
        }

        // 3. Calculate required SOL (rounded to 9 decimal places for Lamport precision representation)
        const amountSolCharged = Number((amount_usd / solPrice).toFixed(9));

        if (amountSolCharged <= 0) {
            return res.status(400).json({ error: 'Amount too small to charge.' });
        }

        // 4. Generate Base64 Transaction Payload
        const transactionPayload = await buildUnsignedTransaction(
            source_wallet,
            destination_wallet,
            amountSolCharged
        );

        // 5. Return success payload
        return res.status(200).json({
            status: 'requires_signature',
            amount_usd: amount_usd,
            exchange_rate_sol: solPrice,
            amount_sol_charged: amountSolCharged,
            transaction_payload: transactionPayload
        });

    } catch (error) {
        console.error(`[Charge Route] Error processing charge: ${error.message}`);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

module.exports = router;
