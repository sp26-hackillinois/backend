/**
 * ============================================================
 * Micropay Bazaar — Full Backend Test Suite
 * ============================================================
 * Usage:
 *   node test-backend.js                                    # defaults to localhost:3000
 *   node test-backend.js https://your-app.up.railway.app    # test Railway
 * ============================================================
 */

const BASE_URL = process.argv[2] || 'https://micropay.up.railway.app';
const API_KEY = process.argv[3] || 'mp_live_demo_key';

// ── State ──
let pass = 0;
let fail = 0;
let total = 0;
let serviceId = null;
let chargeId = null;

// ── Colors ──
const c = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
    reset: '\x1b[0m',
};

// ── Helper ──
async function test(name, method, path, body, expectedStatus) {
    total++;
    try {
        const opts = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
        };
        if (body) opts.body = JSON.stringify(body);

        const res = await fetch(`${BASE_URL}${path}`, opts);
        const status = res.status;

        let data = null;
        try {
            data = await res.json();
        } catch {
            try { data = await res.text(); } catch { data = null; }
        }

        if (status === expectedStatus) {
            pass++;
            console.log(`  ${c.green}✅ PASS${c.reset} [${status}] ${name}`);
        } else {
            fail++;
            console.log(`  ${c.red}❌ FAIL${c.reset} [${status}] ${name} (expected ${expectedStatus})`);
            console.log(`     ${c.red}↳ ${JSON.stringify(data)}${c.reset}`);
        }

        return { status, data };
    } catch (err) {
        fail++;
        console.log(`  ${c.red}❌ FAIL${c.reset} [ERR] ${name}`);
        console.log(`     ${c.red}↳ ${err.message}${c.reset}`);
        return { status: 0, data: null };
    }
}

// ── Main ──
async function run() {
    console.log('');
    console.log(`${c.cyan}============================================================${c.reset}`);
    console.log(`${c.cyan}  Micropay Bazaar — Backend Test Suite${c.reset}`);
    console.log(`${c.cyan}  Target: ${c.yellow}${BASE_URL}${c.reset}`);
    console.log(`${c.cyan}============================================================${c.reset}`);
    console.log('');

    // ── 1. HEALTH & NETWORK ──
    console.log(`${c.yellow}── 1. Health & Network ──${c.reset}`);
    await test('GET /api/v1/health', 'GET', '/api/v1/health', null, 200);
    await test('GET /api/v1/network/status', 'GET', '/api/v1/network/status', null, 200);

    // ── 2. DOCS ──
    console.log(`\n${c.yellow}── 2. Docs ──${c.reset}`);
    await test('GET /docs returns HTML docs', 'GET', '/docs', null, 200);

    // ── 3. REGISTRY — Register ──
    console.log(`\n${c.yellow}── 3. Registry — Register a Service ──${c.reset}`);

    const regResult = await test('POST /api/v1/registry/register — create test service', 'POST', '/api/v1/registry/register', {
        name: 'Test AI Service',
        description: 'A test service for backend validation',
        developer_wallet: '2Hn6ESeMRqfVDTptanXgK6vDEpgJGnp4rG6Ls3dzszv8',
        cost_usd: 0.01,
        endpoint: 'https://example.com/api/test',
    }, 201);

    // Extract service ID
    if (regResult.data) {
        serviceId = regResult.data.id || regResult.data.service_id || regResult.data.data?.id || regResult.data.data?.service_id || null;
    }
    console.log(`     ${c.cyan}↳ Service ID: ${serviceId || '(not found)'}${c.reset}`);

    await test('POST /api/v1/registry/register — missing fields → 400', 'POST', '/api/v1/registry/register', {}, 400);

    // ── 4. REGISTRY — Discover ──
    console.log(`\n${c.yellow}── 4. Registry — Discover Services ──${c.reset}`);

    await test('GET /api/v1/registry/discover — list all', 'GET', '/api/v1/registry/discover', null, 200);
    await test('GET /api/v1/registry/discover?category=ai — filter', 'GET', '/api/v1/registry/discover?category=ai', null, 200);

    if (serviceId) {
        await test('GET /api/v1/registry/services/:id — specific service', 'GET', `/api/v1/registry/services/${serviceId}`, null, 200);
    }

    await test('GET /api/v1/registry/services/bad-id — 404', 'GET', '/api/v1/registry/services/nonexistent-id-12345', null, 404);

    // ── 5. CHARGES ──
    console.log(`\n${c.yellow}── 5. Charges ──${c.reset}`);

    const chargeResult = await test('POST /api/v1/charges — create charge', 'POST', '/api/v1/charges', {
        service_id: 'weather_openmeteo',
        source_wallet: 'AuofYo21iiX8NQtgWBXLRFMiWfv83z2CbnhPNen6WNt5',
    }, 200);

    if (chargeResult.data) {
        chargeId = chargeResult.data.id || chargeResult.data.charge_id || chargeResult.data.data?.id || null;
    }
    if (chargeId) {
        console.log(`     ${c.cyan}↳ Charge ID: ${chargeId}${c.reset}`);
    }

    await test('POST /api/v1/charges — missing fields → 400', 'POST', '/api/v1/charges', {}, 400);
    await test('GET /api/v1/charges — list charges', 'GET', '/api/v1/charges', null, 200);

    if (chargeId) {
        await test('GET /api/v1/charges/:id — specific charge', 'GET', `/api/v1/charges/${chargeId}`, null, 200);
    }

    // ── 6. BALANCE ──
    console.log(`\n${c.yellow}── 6. Balance ──${c.reset}`);
    await test('GET /api/v1/balance/:wallet', 'GET', '/api/v1/balance/AuofYo21iiX8NQtgWBXLRFMiWfv83z2CbnhPNen6WNt5', null, 200);

    // ── 7. CHAT — Legacy ──
    console.log(`\n${c.yellow}── 7. Chat — Legacy Completions ──${c.reset}`);

    const chatResult = await test('POST /api/v1/chat/completions', 'POST', '/api/v1/chat/completions', {
        message: 'Say hello in exactly 3 words',
        model: 'gpt-4o-mini',
    }, 200);
    if (chatResult.data) {
        const reply = chatResult.data.reply || chatResult.data.choices?.[0]?.message?.content || JSON.stringify(chatResult.data).slice(0, 100);
        console.log(`     ${c.cyan}↳ Reply: ${reply}${c.reset}`);
    }

    // ── 8. AI — New OpenAI Direct ──
    console.log(`\n${c.yellow}── 8. AI — Direct OpenAI Chat ──${c.reset}`);

    const aiResult = await test('POST /api/ai/chat — basic message', 'POST', '/api/ai/chat', {
        message: 'What is 2+2? Reply with just the number.',
        model: 'gpt-4o-mini',
    }, 200);
    if (aiResult.data) {
        console.log(`     ${c.cyan}↳ Reply: ${aiResult.data.reply || '(no reply field)'}${c.reset}`);
        console.log(`     ${c.cyan}↳ Model: ${aiResult.data.model || '(no model field)'}${c.reset}`);
    }

    await test('POST /api/ai/chat — no model field (defaults to gpt-4o-mini)', 'POST', '/api/ai/chat', {
        message: 'Say OK',
    }, 200);

    await test('POST /api/ai/chat — invalid model falls back', 'POST', '/api/ai/chat', {
        message: 'Say OK',
        model: 'invalid-model-xyz',
    }, 200);

    await test('POST /api/ai/chat — missing message → 400', 'POST', '/api/ai/chat', {}, 400);

    // ── 9. ERROR HANDLING ──
    console.log(`\n${c.yellow}── 9. Error Handling ──${c.reset}`);

    await test('GET /api/v1/nonexistent — 404', 'GET', '/api/v1/nonexistent', null, 404);

    const errResult = await test('404 returns consistent error shape', 'GET', '/api/v1/does-not-exist', null, 404);
    if (errResult.data?.error) {
        const hasType = !!errResult.data.error.type;
        const hasMessage = !!errResult.data.error.message;
        const hasRequestId = !!errResult.data.error.request_id;
        console.log(`     ${c.cyan}↳ Error shape: type=${hasType}, message=${hasMessage}, request_id=${hasRequestId}${c.reset}`);
    }

    // ── RESULTS ──
    console.log('');
    console.log(`${c.cyan}============================================================${c.reset}`);
    console.log(`${c.cyan}  RESULTS${c.reset}`);
    console.log(`${c.cyan}============================================================${c.reset}`);
    console.log(`  Total:  ${total}`);
    console.log(`  ${c.green}Passed: ${pass}${c.reset}`);
    console.log(`  ${c.red}Failed: ${fail}${c.reset}`);
    console.log('');

    if (fail === 0) {
        console.log(`  ${c.green}🎉 ALL TESTS PASSED!${c.reset}`);
    } else {
        console.log(`  ${c.red}⚠️  ${fail} test(s) failed. Check output above.${c.reset}`);
    }
    console.log('');

    process.exit(fail > 0 ? 1 : 0);
}

run();
