require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { verifyApiKey } = require('./middleware/auth.middleware');
const chargeRoutes = require('./routes/charge.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors()); // Allow all origins for the hackathon

// Apply API Key authentication middleware to all /api routes
app.use('/api', verifyApiKey);

// Mount routes
app.use('/api/v1/charges', chargeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start Server
app.listen(PORT, () => {
    console.log(`[Server] Micropay API running on port ${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});
