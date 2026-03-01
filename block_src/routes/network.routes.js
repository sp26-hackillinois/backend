const express = require('express');
const router = express.Router();
const { verifyApiKey } = require('../middleware/auth.middleware');
const { getWalletBalance, getNetworkStatus } = require('../services/network.service');
const { Connection, PublicKey } = require('@solana/web3.js');

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// The developer wallet that receives all playground payments
const DEVELOPER_WALLET = process.env.AI_DEVELOPER_WALLET || '2Hn6ESeMRqfVDTptanXgK6vDEpgJGnp4rG6Ls3dzszv8';

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
// Get SOL balance for a wallet address (public — no auth)
// ─────────────────────────────────────────
router.get('/balance/:wallet', async (req, res) => {
    const { wallet } = req.params;
    try {
        const balanceInfo = await getWalletBalance(wallet);
        return res.status(200).json({
            ...balanceInfo,
            developer_wallet: DEVELOPER_WALLET,
        });
    } catch (error) {
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

// ─────────────────────────────────────────
// GET /api/v1/transactions/:wallet
// Get last 20 transactions for a wallet (public — no auth)
// Returns both incoming and outgoing with stable direction field
// ─────────────────────────────────────────
router.get('/transactions/:wallet', async (req, res) => {
    const { wallet } = req.params;

    let pubkey;
    try {
        pubkey = new PublicKey(wallet);
    } catch {
        return res.status(400).json({
            error: {
                type: 'invalid_request_error',
                message: 'Invalid Solana wallet address.',
            },
        });
    }

    try {
        const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 20 });

        const transactions = await Promise.all(
            signatures.map(async (sigInfo) => {
                try {
                    const tx = await connection.getParsedTransaction(sigInfo.signature, {
                        commitment: 'confirmed',
                        maxSupportedTransactionVersion: 0,
                    });

                    // Find the index of the queried wallet in this transaction's account keys
                    const accountKeys = tx.transaction.message.accountKeys.map(k =>
                        k.pubkey ? k.pubkey.toString() : k.toString()
                    );
                    const walletIndex = accountKeys.findIndex(k => k === wallet);

                    let direction = 'unknown';
                    let amount_sol = 0;

                    if (walletIndex !== -1) {
                        const pre = tx.meta.preBalances[walletIndex];
                        const post = tx.meta.postBalances[walletIndex];
                        amount_sol = parseFloat(
                            (Math.abs(pre - post) / 1_000_000_000).toFixed(9)
                        );
                        direction = post > pre ? 'incoming' : 'outgoing';
                    }

                    return {
                        signature: sigInfo.signature,
                        status: sigInfo.err ? 'failed' : 'settled',
                        amount_sol,
                        direction,
                        time: sigInfo.blockTime
                            ? new Date(sigInfo.blockTime * 1000).toISOString()
                            : null,
                        description: direction === 'outgoing' ? 'Payment Sent' : direction === 'incoming' ? 'Payment Received' : 'Solana Transfer',
                    };
                } catch {
                    return {
                        signature: sigInfo.signature,
                        status: sigInfo.err ? 'failed' : 'settled',
                        amount_sol: 0,
                        direction: 'unknown',
                        time: sigInfo.blockTime
                            ? new Date(sigInfo.blockTime * 1000).toISOString()
                            : null,
                        description: 'Solana Transfer',
                    };
                }
            })
        );

        return res.status(200).json({
            wallet,
            developer_wallet: DEVELOPER_WALLET,
            transactions,
        });
    } catch (error) {
        console.error('[Transactions] RPC error:', error.message);
        return res.status(500).json({
            error: {
                type: 'api_error',
                message: 'Failed to fetch transactions from Solana RPC.',
            },
        });
    }
});

module.exports = router;
