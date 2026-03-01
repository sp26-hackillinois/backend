const express = require('express');
const router = express.Router();
const axios = require('axios');
const { verifyApiKey } = require('../middleware/auth.middleware');
const { discoverServices, getServiceById } = require('../utils/store');

const CHARSET = 'abcdefghijklmnopqrstuvwxyz0123456789';
function randomString(len) {
    let s = '';
    for (let i = 0; i < len; i++) s += CHARSET[Math.floor(Math.random() * CHARSET.length)];
    return s;
}
function generateConversationId() { return 'conv_' + randomString(12); }

const CATEGORY_COST_USD = {
    Weather: 0.01, Finance: 0.01, NLP: 0.01, Food: 0.01, Blockchain: 0.01,
    News: 0.02, Sports: 0.02, Data: 0.02, Search: 0.05, Travel: 0.05, AI: 0.05,
};
const DEFAULT_COST_USD = 0.01;

function estimatedCost(service) {
    if (service.id === 'openai_chat') return 0.05;
    return CATEGORY_COST_USD[service.category] ?? DEFAULT_COST_USD;
}

const conversationStore = new Map();
const MAX_HISTORY = 20;
function getHistory(id) { return conversationStore.get(id) || []; }
function setHistory(id, msgs) { conversationStore.set(id, msgs.slice(-MAX_HISTORY)); }

function buildTools(services) {
    return services.map(s => ({
        type: 'function',
        function: {
            name: s.id,
            description: `${s.name}: ${s.description} (Cost: estimated based on usage)`,
            parameters: {
                type: 'object',
                properties: { query: { type: 'string', description: 'The specific query or input for this tool' } },
                required: ['query'],
            },
        },
    }));
}

const SYSTEM_PROMPT = `You are an AI assistant powered by Micropay Bazaar — a discovery registry and payment gateway for AI agents on Solana. You have access to paid data tools that can be unlocked with micro-payments. When you need real-time or external data (weather, stocks, news, sports, crypto, etc.), call the appropriate tool function. The user will be charged a micro-payment in SOL to access the data. Available tools are provided as functions. Be concise and helpful.`;

async function callOpenRouter(messages, tools) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw Object.assign(new Error('Chat service not configured.'), { code: 'NO_KEY' });
    const payload = { model: 'gpt-4o-mini', messages };
    if (tools && tools.length > 0) { payload.tools = tools; payload.tool_choice = 'auto'; }
    const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 30000,
    });
    return response.data;
}

// POST /api/v1/chat/completions
router.post('/completions', verifyApiKey, async (req, res) => {
    const { message, conversation_id, source_wallet } = req.body;
    if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({ error: { type: 'invalid_request_error', message: "'message' is required and must be a non-empty string." } });
    }
    const convId = (conversation_id && typeof conversation_id === 'string') ? conversation_id.trim() : generateConversationId();
    const services = discoverServices();
    const tools = buildTools(services);
    const history = getHistory(convId);
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: message.trim() }];
    let orData;
    try {
        orData = await callOpenRouter(messages, tools);
    } catch (err) {
        if (err.code === 'NO_KEY') return res.status(500).json({ error: { type: 'api_error', message: 'Chat service not configured.' } });
        console.error('[Chat] OpenRouter error:', err.response?.data || err.message);
        return res.status(502).json({ error: { type: 'gateway_error', message: 'AI service temporarily unavailable.' } });
    }
    const choice = orData.choices?.[0];
    const assistantMsg = choice?.message;
    const modelUsed = orData.model || 'gpt-4o-mini';

    if (assistantMsg?.tool_calls?.length > 0) {
        const toolCall = assistantMsg.tool_calls[0];
        const serviceId = toolCall.function?.name;
        const toolArgs = (() => { try { return JSON.parse(toolCall.function?.arguments || '{}'); } catch { return {}; } })();
        const query = toolArgs.query || message.trim();
        const service = getServiceById(serviceId);
        const serviceName = service?.name || serviceId;
        const cost = service ? estimatedCost(service) : DEFAULT_COST_USD;
        const humanMsg = `I need to access **${serviceName}** to answer your question. This requires a micro-payment of approximately $${cost.toFixed(2)} (paid in SOL on Solana Devnet).`;
        setHistory(convId, [...history, { role: 'user', content: message.trim() }, assistantMsg]);
        return res.status(200).json({ type: 'tool_call', conversation_id: convId, tool_call: { id: toolCall.id, service_id: serviceId, service_name: serviceName, query, estimated_cost_usd: cost }, message: humanMsg, model: modelUsed });
    } else {
        const content = assistantMsg?.content || '';
        setHistory(convId, [...history, { role: 'user', content: message.trim() }, { role: 'assistant', content }]);
        return res.status(200).json({ type: 'message', conversation_id: convId, content, model: modelUsed });
    }
});

// POST /api/v1/chat/tool-result
router.post('/tool-result', verifyApiKey, async (req, res) => {
    const { conversation_id, service_id, tool_result } = req.body;
    if (!conversation_id || typeof conversation_id !== 'string' || conversation_id.trim() === '')
        return res.status(400).json({ error: { type: 'invalid_request_error', message: "'conversation_id' is required." } });
    if (tool_result === undefined || tool_result === null || String(tool_result).trim() === '')
        return res.status(400).json({ error: { type: 'invalid_request_error', message: "'tool_result' is required and must be non-empty." } });

    const convId = conversation_id.trim();
    const history = getHistory(convId);
    let toolCallId = service_id || 'tool_call_0';
    const lastAssistant = [...history].reverse().find(m => m.role === 'assistant');
    if (lastAssistant?.tool_calls?.[0]?.id) toolCallId = lastAssistant.tool_calls[0].id;

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'tool', tool_call_id: toolCallId, content: String(tool_result) }];
    let orData;
    try {
        orData = await callOpenRouter(messages, null);
    } catch (err) {
        if (err.code === 'NO_KEY') return res.status(500).json({ error: { type: 'api_error', message: 'Chat service not configured.' } });
        return res.status(502).json({ error: { type: 'gateway_error', message: 'AI service temporarily unavailable.' } });
    }
    const content = orData.choices?.[0]?.message?.content || '';
    const modelUsed = orData.model || 'gpt-4o-mini';
    setHistory(convId, [...history, { role: 'tool', tool_call_id: toolCallId, content: String(tool_result) }, { role: 'assistant', content }]);
    return res.status(200).json({ type: 'message', conversation_id: convId, content, model: modelUsed });
});

module.exports = router;
