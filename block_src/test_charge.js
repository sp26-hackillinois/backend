const http = require('http');

const body = JSON.stringify({
    amount_usd: 0.05,
    source_wallet: "AuofYo21iiX8NQtgWBXLRFMiWfv83z2CbnhPNen6WNt5",
    destination_wallet: "2Hn6ESeMRqfVDTptanXgK6vDEpgJGnp4rG6Ls3dzszv8"
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/charges',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mp_live_demo_key',
        'Content-Length': Buffer.byteLength(body)
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(`\n[Status] HTTP ${res.statusCode}`);
        const parsed = JSON.parse(data);
        if (parsed.transaction_payload) {
            parsed.transaction_payload = parsed.transaction_payload.substring(0, 40) + '... [truncated]';
        }
        console.log('[Response]', JSON.stringify(parsed, null, 2));
        if (res.statusCode === 200) {
            console.log('\n✅ SUCCESS: Charge created — Solana tx pipeline working!');
            console.log(`   Amount USD:  $${parsed.amount_usd}`);
            console.log(`   SOL Rate:    1 SOL = $${parsed.exchange_rate_sol}`);
            console.log(`   Amount SOL:  ${parsed.amount_sol_charged} SOL`);
            console.log(`   Status:      ${parsed.status}`);
        } else {
            console.log('\n❌ FAILED: Check error above.');
        }
    });
});

req.on('error', (e) => console.error(`❌ Request error: ${e.message}`));
req.write(body);
req.end();
