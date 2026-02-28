const http = require('http');

const body = JSON.stringify({
    service_id: "weather_openmeteo",
    source_wallet: "AuofYo21iiX8NQtgWBXLRFMiWfv83z2CbnhPNen6WNt5"
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
            console.log('\n✅ SUCCESS: Charge created — service_id lookup + Solana tx working!');
            console.log(`   Service: ${parsed.service_name}`);
            console.log(`   Amount: $${parsed.amount_usd} → ${parsed.amount_sol} SOL`);
            console.log(`   Rate: 1 SOL = $${parsed.exchange_rate_sol_usd}`);
            console.log(`   Network fee: ${parsed.network_fee_sol} SOL`);
            console.log(`   Status: ${parsed.status}`);
        } else {
            console.log('\n❌ FAILED: Check error above.');
        }
    });
});

req.on('error', (e) => console.error(`❌ Request error: ${e.message}`));
req.write(body);
req.end();
