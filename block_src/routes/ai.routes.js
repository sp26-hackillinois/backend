const express = require('express');
const router = express.Router();
const axios = require('axios');
const {
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
    Keypair,
    LAMPORTS_PER_SOL,
} = require('@solana/web3.js');
const { decode } = require('bs58');

const ALLOWED_MODELS = ['gpt-4o', 'gpt-4o-mini', 'o1-mini', 'o3-mini'];

// Devnet connection
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Hardcoded devnet consumer keypair (from env)
function getConsumerKeypair() {
    const secret = process.env.AI_CONSUMER_WALLET_PRIVATE;
    if (!secret) throw new Error('AI_CONSUMER_WALLET_PRIVATE not configured.');
    const decoded = decode(secret);
    return Keypair.fromSecretKey(decoded);
}

// Developer wallet — receives all playground payments, shows up in dashboard transactions
const DESTINATION_WALLET = process.env.AI_DEVELOPER_WALLET || '2Hn6ESeMRqfVDTptanXgK6vDEpgJGnp4rG6Ls3dzszv8';

// Cost per playground query in SOL (tiny amount for demo)
const QUERY_COST_SOL = 0.000001;

/**
 * Fires a real devnet SOL transaction — fire and forget.
 * Does NOT wait for confirmation to avoid 429 rate limit errors.
 * Transaction still hits the chain a few seconds later.
 */
async function fireOnChainTransaction() {
    const keypair = getConsumerKeypair();
    const sender = keypair.publicKey;
    const recipient = new PublicKey(DESTINATION_WALLET);
    const lamports = Math.round(QUERY_COST_SOL * LAMPORTS_PER_SOL);

    const { blockhash } = await connection.getLatestBlockhash({ commitment: 'finalized' });

    const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: sender,
    });

    transaction.add(
        SystemProgram.transfer({
            fromPubkey: sender,
            toPubkey: recipient,
            lamports,
        })
    );

    transaction.sign(keypair);

    // Send but do NOT await confirmation — avoids 429 rate limit retries
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: true,
    });

    console.log(`[AI Chat] On-chain tx submitted: ${signature}`);
    return signature;
}

// ─────────────────────────────────────────
// POST /api/ai/chat
// Fires a real on-chain devnet tx, then calls OpenAI
// ─────────────────────────────────────────
router.post('/chat', async (req, res) => {
    try {
        const { message, model } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }

        const selectedModel = ALLOWED_MODELS.includes(model) ? model : 'gpt-4o-mini';

        // Step 1: Fire on-chain transaction (fire and forget — no confirmation wait)
        let tx_signature = null;
        try {
            tx_signature = await fireOnChainTransaction();
        } catch (txErr) {
            console.error('[AI Chat] Transaction failed:', txErr.message);
            // Don't block the query if tx fails — just log it
        }

        // Step 2: Call OpenAI
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: selectedModel,
                messages: [{ role: 'user', content: message }],
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        // Step 3: Return reply + tx proof
        return res.json({
            reply: response.data.choices[0].message.content,
            model: selectedModel,
            usage: response.data.usage,
            tx_signature,
            amount_sol: QUERY_COST_SOL,
        });

    } catch (err) {
        console.error('OpenAI API error:', err.response?.data || err.message);
        return res.status(err.response?.status || 500).json({
            error: 'AI request failed',
            details: err.response?.data?.error?.message || err.message,
        });
    }
});

module.exports = router;
