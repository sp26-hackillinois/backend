/**
 * test_charge.js
 * Tests POST /api/v1/charges against localhost or a remote host.
 *
 * Usage:
 *   node test_charge.js                                      ← localhost:3000
 *   node test_charge.js https://micropay.up.railway.app     ← Railway
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// ── Config ────────────────────────────────────────────────────────────────
const BASE_URL = process.argv[2] || 'http://localhost:3000';
const API_KEY = 'mp_live_demo_key';

const parsed = new URL(BASE_URL);
const isHttps = parsed.protocol === 'https:';
const transport = isHttps ? https : http;

const body = JSON.stringify({
    service_id: "weather_openmeteo",
    source_wallet: "AuofYo21iiX8NQtgWBXLRFMiWfv83z2CbnhPNen6WNt5"
});

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

// ── Request ───────────────────────────────────────────────────────────────
console.log(`\n🚀 Testing: ${BASE_URL}/api/v1/charges`);
console.log(`🔑 API Key: ${API_KEY}`);
console.log(`📦 Body:    ${body}\n`);

const req = transport.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(`[Status] HTTP ${res.statusCode}`);
        const parsed = JSON.parse(data);
        if (parsed.transaction_payload) {
            parsed.transaction_payload = parsed.transaction_payload.substring(0, 40) + '... [truncated]';
        }
        console.log('[Response]', JSON.stringify(parsed, null, 2));

        if (res.statusCode === 200) {
            console.log('\n✅ SUCCESS: Charge created!');
            console.log(`   Status:     ${parsed.status}`);
            if (parsed.amount_usd) console.log(`   Amount USD: $${parsed.amount_usd}`);
            if (parsed.amount_sol_charged) console.log(`   Amount SOL: ${parsed.amount_sol_charged} SOL`);
            if (parsed.exchange_rate_sol) console.log(`   SOL Rate:   1 SOL = $${parsed.exchange_rate_sol}`);
        } else {
            console.log('\n❌ FAILED: Check error above.');
        }
    });
});

req.on('error', (e) => console.error(`❌ Request error: ${e.message}`));
req.write(body);
req.end();
