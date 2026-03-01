const express = require('express');
const router = express.Router();
const axios = require('axios');

const ALLOWED_MODELS = ['gpt-4o', 'gpt-4o-mini', 'o1-mini', 'o3-mini'];

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
    try {
        const { message, model } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }

        // Validate model if provided, default to gpt-4o-mini
        const selectedModel = ALLOWED_MODELS.includes(model) ? model : 'gpt-4o-mini';

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: selectedModel,
            messages: [{ role: 'user', content: message }]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.json({
            reply: response.data.choices[0].message.content,
            model: selectedModel,
            usage: response.data.usage
        });

    } catch (err) {
        console.error('OpenAI API error:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json({
            error: 'AI request failed',
            details: err.response?.data?.error?.message || err.message
        });
    }
});

module.exports = router;
