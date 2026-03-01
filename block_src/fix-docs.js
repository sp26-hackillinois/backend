const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '../micropay-docs.html');
let html = fs.readFileSync(target, 'utf8');

// 1. Navigation links
html = html.replace(/<a href="#services-post"><span class="dot dp"><\/span>Register a Service<\/a>/g, '<a href="#services-post"><span class="dot dp"></span>Register a Service</a>');
html = html.replace(/<a href="#services-delete"><span class="dot dd"><\/span>Delete a Service<\/a>\n?/g, '');

// 2. Endpoints
html = html.replace(/\/api\/v1\/services\/<span class="p">:service_id<\/span>/g, '/api/v1/registry/services/<span class="p">:id</span>');
html = html.replace(/\/api\/v1\/services/g, '/api/v1/registry/discover');
html = html.replace(/\/api\/v1\/registry\/discover \(POST\)/g, '/api/v1/registry/register'); // if any
html = html.replace(/<div class="ep-path">\/api\/v1\/registry\/discover<\/div>\s*<div class="ep-sum">Register a new service/g, '<div class="ep-path">/api/v1/registry/register</div>\n      <div class="ep-sum">Register a new service');
html = html.replace(/http:\/\/localhost:3000\/api\/v1\/registry\/discover \\/g, 'http://localhost:3000/api/v1/registry/discover \\');
html = html.replace(/'http:\/\/localhost:3000\/api\/v1\/registry\/discover', {/g, '\'http://localhost:3000/api/v1/registry/register\', {');

// 3. POST /register schema
html = html.replace(/<td class="pn">endpoint_url<\/td>/g, '<td class="pn">endpoint</td>');
html = html.replace(/<td class="pn">price_usd<\/td>/g, '<td class="pn">cost_usd</td>');
html = html.replace(/<td class="pn">wallet_address<\/td>/g, '<td class="pn">developer_wallet</td>');
html = html.replace(/"endpoint_url":/g, '"endpoint":');
html = html.replace(/"price_usd":/g, '"cost_usd":');
html = html.replace(/"wallet_address":/g, '"developer_wallet":');

// 4. GET /discover query params
html = html.replace(/<tr><td class="pn">limit<\/td>[\s\S]*?<tr><td class="pn">active<\/td>/g, '<tr><td class="pn">query</td><td class="pt">string</td><td class="opt">optional</td><td class="pd">Full-text search across name, description, and tags.</td></tr>\n        <!-- REMOVED -->');
html = html.replace(/http:\/\/localhost:3000\/api\/v1\/registry\/discover\?tag=nlp&amp;max_price_usd=0.01&amp;limit=10/g, 'http://localhost:3000/api/v1/registry/discover?query=nlp');

// 5. POST /charges schema
html = html.replace(/<td class="pn">payer_wallet<\/td>/g, '<td class="pn">source_wallet</td>');
html = html.replace(/<tr><td class="pn">payer_secret<\/td>.*?<\/tr>\n/g, '');
html = html.replace(/"payer_wallet":/g, '"source_wallet":');
html = html.replace(/,\n\s*"payer_secret": "5Kb8kLf9..."/g, '');
html = html.replace(/payer_secret: bs58\.encode\(agentWallet\.secretKey\),?\n?/g, '');

// 6. Delete section out
const deleteStart = html.indexOf('<!-- DELETE /services/:id -->');
if (deleteStart !== -1) {
    const deleteEnd = html.indexOf('<hr/>', deleteStart);
    if (deleteEnd !== -1) {
        html = html.substring(0, deleteStart) + html.substring(deleteEnd);
    }
}

// 7. Add Chat section right before NETWORK
const chatSection = `
<!-- ══════════════════════════════
     CHAT & AI
══════════════════════════════ -->
<div class="section" id="chat-section">
  <h2>Chat & AI Prompts</h2>
  <p class="sdesc">Endpoints for sending messages to the AI agent and handling micro-payment tool calls.</p>
</div>

<!-- POST /chat/completions -->
<div class="ep" id="chat-completions">
  <div class="ep-head" onclick="toggle(this)">
    <span class="badge POST">POST</span>
    <div class="ep-meta">
      <div class="ep-path">/api/v1/chat/completions</div>
      <div class="ep-sum">Send a message to the autonomous agent. Handles tool calls automatically.</div>
    </div>
    <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
  </div>
  <div class="ep-body">
    <div class="ptitle">Request Body</div>
    <table>
      <thead><tr><th>Field</th><th>Type</th><th></th><th>Description</th></tr></thead>
      <tbody>
        <tr><td class="pn">message</td><td class="pt">string</td><td class="req">REQUIRED</td><td class="pd">The user prompt.</td></tr>
        <tr><td class="pn">conversation_id</td><td class="pt">string</td><td class="opt">optional</td><td class="pd">Used to maintain context across turns.</td></tr>
        <tr><td class="pn">source_wallet</td><td class="pt">string</td><td class="opt">optional</td><td class="pd">For logging/charges.</td></tr>
      </tbody>
    </table>
  </div>
</div>

<hr/>
`;

const networkSectionStart = html.indexOf('<!-- ══════════════════════════════\n     NETWORK');
if (networkSectionStart !== -1) {
    html = html.substring(0, networkSectionStart) + chatSection + html.substring(networkSectionStart);
}

// 8. Fix some lingering /services urls
html = html.replace(/curl -X POST http:\/\/localhost:3000\/api\/v1\/registry\/discover \\/g, 'curl -X POST http://localhost:3000/api/v1/registry/register \\');
html = html.replace(/curl -G http:\/\/localhost:3000\/api\/v1\/registry\/discover/g, 'curl -G http://localhost:3000/api/v1/registry/discover');

// 9. Quick Start fixes
html = html.replace(/http:\/\/localhost:3000\/api\/v1\/services/g, 'http://localhost:3000/api/v1/registry/discover');

fs.writeFileSync(target, html, 'utf8');
console.log('Docs updated properly.');
