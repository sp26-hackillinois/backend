/**
 * test_full_flow.js
 * Full end-to-end test via HTTP API:
 *   1. POST /api/v1/charges  → get transaction_payload
 *   2. Decode the Base64 transaction
 *   3. Sign with private key from .env
 *   4. Broadcast to Solana Devnet
 *   5. Print Explorer link
 *
 * Usage:
 *   node test_full_flow.js                                   ← localhost:3000
 *   node test_full_flow.js https://micropay.up.railway.app   ← Railway
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { Connection, Keypair, Transaction } = require('@solana/web3.js');
const bs58 = require('bs58').default || require('bs58');

// ── Config ────────────────────────────────────────────────────────────────
const BASE_URL = process.argv[2] || 'http://localhost:3000';
const API_KEY = 'mp_live_demo_key';
const SERVICE_ID = 'weather_openmeteo';

const parsed = new URL(BASE_URL);
const isHttps = parsed.protocol === 'https:';
const transport = isHttps ? https : http;

// ── Step 1: Call the API ──────────────────────────────────────────────────
function callChargeApi(sourceWallet) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ service_id: SERVICE_ID, source_wallet: sourceWallet });

        const options = {
            hostname: parsed.hostname,
            port: parsed.port || (isHttps ? 443 : 3000),
            path: '/api/v1/charges',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = transport.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    return reject(new Error(`API returned ${res.statusCode}: ${data}`));
                }
                resolve(JSON.parse(data));
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ── Main ──────────────────────────────────────────────────────────────────
async function runFullFlow() {
    console.log(`\n🚀 Full End-to-End Test`);
    console.log(`   API:     ${BASE_URL}/api/v1/charges`);
    console.log(`   Service: ${SERVICE_ID}\n`);

    // Load wallet from .env
    const privateKeyRaw = process.env.AI_CONSUMER_WALLET_PRIVATE;
    if (!privateKeyRaw) throw new Error('Missing AI_CONSUMER_WALLET_PRIVATE in .env');

    let keypair;
    try {
        keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(privateKeyRaw)));
    } catch {
        keypair = Keypair.fromSecretKey(bs58.decode(privateKeyRaw.trim().replace(/^[\"']|[\"']$/g, '')));
    }

    const sourceWallet = keypair.publicKey.toString();
    console.log(`✅ Loaded wallet: ${sourceWallet}`);

    // Step 1: Get transaction payload from API
    console.log('\n📡 Step 1: Calling API...');
    const charge = await callChargeApi(sourceWallet);
    console.log(`   Charge ID:  ${charge.id}`);
    console.log(`   Service:    ${charge.service_name}`);
    console.log(`   Amount:     $${charge.amount_usd} → ${charge.amount_sol} SOL`);
    console.log(`   Status:     ${charge.status}`);

    // Step 2: Decode Base64 transaction
    console.log('\n🔓 Step 2: Decoding transaction payload...');
    const txBuffer = Buffer.from(charge.transaction_payload, 'base64');
    const transaction = Transaction.from(txBuffer);
    console.log('   Transaction decoded ✅');

    // Step 3: Sign
    console.log('\n✍️  Step 3: Signing transaction...');
    transaction.sign(keypair);
    console.log('   Signed ✅');

    // Step 4: Broadcast to Devnet
    console.log('\n🌐 Step 4: Broadcasting to Solana Devnet...');
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const signature = await connection.sendRawTransaction(transaction.serialize());

    console.log('\n🎉 SUCCESS! Transaction confirmed on Devnet!');
    console.log(`🔍 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
}

runFullFlow().catch(e => {
    console.error('\n❌ FAILED:', e.message);
    process.exit(1);
});
