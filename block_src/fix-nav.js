const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '../micropay-docs.html');
let html = fs.readFileSync(target, 'utf8');

const newNav = `
    <div class="nav-group">Registry</div>
    <a href="#services-post"><span class="dot dp"></span>Register a Service</a>
    <a href="#services-list"><span class="dot dg"></span>Discover Services</a>
    <a href="#services-get"><span class="dot dg"></span>Get a Service</a>

    <div class="nav-group">Charges</div>
    <a href="#charges-post"><span class="dot dp"></span>Create a Charge</a>
    <a href="#charges-list"><span class="dot dg"></span>List Charges</a>
    <a href="#charges-get"><span class="dot dg"></span>Get a Charge</a>

    <div class="nav-group">Chat &amp; AI</div>
    <a href="#chat-completions"><span class="dot dp"></span>Chat Completions</a>
    <a href="#ai-chat"><span class="dot dp"></span>Direct AI Chat</a>
    <a href="#tool-result"><span class="dot dp"></span>Tool Result</a>

    <div class="nav-group">Network</div>
    <a href="#health"><span class="dot dg"></span>Health Check</a>
    <a href="#balance"><span class="dot dg"></span>Get Balance</a>
    <a href="#status"><span class="dot dg"></span>Network Status</a>
`;

// Replace the nav links
const navStart = html.indexOf('<div class="nav-group">Registry</div>');
const navEnd = html.indexOf('<div class="nav-group">Reference</div>');
if (navStart !== -1 && navEnd !== -1) {
    html = html.substring(0, navStart) + newNav + '\n    ' + html.substring(navEnd);
}

// Ensure the endpoints in the HTML match these links perfectly. Let's add the missing Chat and Network endpoints headers.
html = html.replace(/<div class="ep" id="price">/g, '<div class="ep" id="status">');
html = html.replace(/\/api\/v1\/network\/price/g, '/api/v1/network/status');
html = html.replace(/Get SOL Price/g, 'Get Network Status');
html = html.replace(/"sol_usd": 70\.42,/g, '"solana_network": "mainnet-beta",\n  "rpc_latency_ms": 42');
html = html.replace(/"source": "coingecko",/g, '');

const toolResultAndChat = `
<!-- POST /chat/tool-result -->
<div class="ep" id="tool-result">
  <div class="ep-head" onclick="toggle(this)">
    <span class="badge POST">POST</span>
    <div class="ep-meta">
      <div class="ep-path">/api/v1/chat/tool-result</div>
      <div class="ep-sum">Feed executed tool data back to the LLM for a final natural response.</div>
    </div>
    <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
  </div>
  <div class="ep-body">
    <div class="ptitle">Request Body</div>
    <table>
      <thead><tr><th>Field</th><th>Type</th><th></th><th>Description</th></tr></thead>
      <tbody>
        <tr><td class="pn">conversation_id</td><td class="pt">string</td><td class="req">REQUIRED</td><td class="pd">Conversation UUID to append the result to.</td></tr>
        <tr><td class="pn">service_id</td><td class="pt">string</td><td class="req">REQUIRED</td><td class="pd">The tool/service ID that was called.</td></tr>
        <tr><td class="pn">tool_result</td><td class="pt">any</td><td class="req">REQUIRED</td><td class="pd">The raw JSON/text output from the tool execution.</td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- POST /api/ai/chat -->
<div class="ep" id="ai-chat">
  <div class="ep-head" onclick="toggle(this)">
    <span class="badge POST">POST</span>
    <div class="ep-meta">
      <div class="ep-path">/api/ai/chat</div>
      <div class="ep-sum">Direct plain-text chat to the OpenAI layer (requires OPENAI_API_KEY environment variable).</div>
    </div>
    <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
  </div>
  <div class="ep-body">
    <div class="ptitle">Request Body</div>
    <table>
      <thead><tr><th>Field</th><th>Type</th><th></th><th>Description</th></tr></thead>
      <tbody>
        <tr><td class="pn">message</td><td class="pt">string</td><td class="req">REQUIRED</td><td class="pd">User message prompt.</td></tr>
        <tr><td class="pn">model</td><td class="pt">string</td><td class="opt">optional</td><td class="pd">Model to use (defaults to gpt-4o-mini).</td></tr>
      </tbody>
    </table>
  </div>
</div>
`;

// Insert the new endpoints
const insertPoint = html.indexOf('<hr/>\n\n<!-- ══════════════════════════════\n     NETWORK');
if (insertPoint !== -1) {
    html = html.substring(0, insertPoint) + toolResultAndChat + html.substring(insertPoint);
}

fs.writeFileSync(target, html, 'utf8');
console.log('Nav and chat endpoints updated.');
