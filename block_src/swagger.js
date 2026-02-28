/**
 * swagger.js — OpenAPI 3.0 specification for Micropay Bazaar API
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: '⚡ Micropay Bazaar API',
            version: '1.0.0',
            description: `
**Micropay Bazaar** is a discovery registry and payment gateway for AI agents using the x402 micro-transaction standard on Solana.

### How it works
1. **Register** your paid API tool via \`POST /api/v1/registry/register\`
2. **Discover** available tools via \`GET /api/v1/registry/discover\`
3. **Create a charge** via \`POST /api/v1/charges\` — get back an unsigned Solana transaction
4. **Sign & submit** the transaction with your Phantom wallet

### Authentication
Protected endpoints require a Bearer token in the \`Authorization\` header.
Use \`test_api_key_123\` or \`mp_live_demo_key\` for testing.

### Network
All Solana transactions target **Devnet**. No real SOL is used.
            `.trim(),
            contact: {
                name: 'HackIllinois 2026',
            },
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Local Development Server',
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'API Key',
                    description: 'Use `test_api_key_123` or `mp_live_demo_key`',
                },
            },
            schemas: {
                // ── Service ──────────────────────────────────────
                Service: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'srv_a8f2k9x1b3m7', description: 'Unique service identifier' },
                        object: { type: 'string', example: 'service' },
                        created_at: { type: 'string', format: 'date-time', example: '2026-02-27T18:00:00.000Z' },
                        name: { type: 'string', example: 'Live Weather API' },
                        description: { type: 'string', example: 'Real-time temperature and precipitation data for any city' },
                        endpoint: { type: 'string', example: 'https://weather-api.example.com/v1/current' },
                        cost_usd: { type: 'number', example: 0.01 },
                        developer_wallet: { type: 'string', example: 'BRjpCHtyQLeSN69hKudVoRGuKXn5VEe2e8cqGKzpdBag' },
                    },
                },
                RegisterServiceRequest: {
                    type: 'object',
                    required: ['name', 'description', 'endpoint', 'cost_usd', 'developer_wallet'],
                    properties: {
                        name: { type: 'string', example: 'Live Weather API' },
                        description: { type: 'string', example: 'Real-time temperature and precipitation data for any city' },
                        endpoint: { type: 'string', example: 'https://weather-api.example.com/v1/current' },
                        cost_usd: { type: 'number', example: 0.01, description: 'Price per API call in USD' },
                        developer_wallet: { type: 'string', example: 'BRjpCHtyQLeSN69hKudVoRGuKXn5VEe2e8cqGKzpdBag', description: 'Solana wallet that will receive payments' },
                    },
                },
                ServiceList: {
                    type: 'object',
                    properties: {
                        object: { type: 'string', example: 'list' },
                        data: { type: 'array', items: { '$ref': '#/components/schemas/Service' } },
                        total_count: { type: 'integer', example: 1 },
                    },
                },
                // ── Charge ───────────────────────────────────────
                Charge: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'ch_a8f2k9x1b3m7' },
                        object: { type: 'string', example: 'charge' },
                        created_at: { type: 'string', format: 'date-time', example: '2026-02-27T18:00:00.000Z' },
                        status: { type: 'string', example: 'requires_signature', enum: ['requires_signature'] },
                        service_id: { type: 'string', example: 'srv_a8f2k9x1b3m7' },
                        service_name: { type: 'string', example: 'Live Weather API' },
                        amount_usd: { type: 'number', example: 0.01 },
                        exchange_rate_sol_usd: { type: 'number', example: 150.25, description: 'SOL/USD rate at time of charge' },
                        amount_sol: { type: 'number', example: 0.000066556, description: 'Equivalent SOL amount (9 decimal places)' },
                        network_fee_sol: { type: 'number', example: 0.000005, description: 'Estimated Solana network fee' },
                        source_wallet: { type: 'string', example: 'DRtXHDgC312wNUSxNRnV2iarFh5Sk5VpTBGoAdnGmWbm', description: "Consumer's wallet (fee payer & sender)" },
                        destination_wallet: { type: 'string', example: 'BRjpCHtyQLeSN69hKudVoRGuKXn5VEe2e8cqGKzpdBag', description: "Developer's wallet (payment recipient)" },
                        transaction_payload: { type: 'string', description: 'Base64-encoded unsigned Solana transaction — sign with Phantom wallet', example: 'AQAAAAAAAAA...' },
                    },
                },
                CreateChargeRequest: {
                    type: 'object',
                    required: ['service_id', 'source_wallet'],
                    properties: {
                        service_id: { type: 'string', example: 'srv_a8f2k9x1b3m7', description: 'ID of the registered service to pay for' },
                        source_wallet: { type: 'string', example: 'DRtXHDgC312wNUSxNRnV2iarFh5Sk5VpTBGoAdnGmWbm', description: 'Base58 Solana public key of the paying wallet' },
                    },
                },
                ChargeList: {
                    type: 'object',
                    properties: {
                        object: { type: 'string', example: 'list' },
                        data: { type: 'array', items: { '$ref': '#/components/schemas/Charge' } },
                        has_more: { type: 'boolean', example: false },
                        total_count: { type: 'integer', example: 1 },
                        limit: { type: 'integer', example: 10 },
                        offset: { type: 'integer', example: 0 },
                    },
                },
                // ── Network ──────────────────────────────────────
                HealthResponse: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'ok' },
                        version: { type: 'string', example: '1.0.0' },
                        timestamp: { type: 'string', format: 'date-time', example: '2026-02-27T18:00:00.000Z' },
                    },
                },
                NetworkStatusResponse: {
                    type: 'object',
                    properties: {
                        network: { type: 'string', example: 'devnet' },
                        current_slot: { type: 'integer', example: 350123456 },
                        block_height: { type: 'integer', example: 300987654 },
                        sol_price_usd: { type: 'number', example: 150.25 },
                        avg_fee_sol: { type: 'number', example: 0.000005 },
                        status: { type: 'string', example: 'operational', enum: ['operational', 'degraded'] },
                    },
                },
                WalletBalanceResponse: {
                    type: 'object',
                    properties: {
                        wallet: { type: 'string', example: 'DRtXHDgC312wNUSxNRnV2iarFh5Sk5VpTBGoAdnGmWbm' },
                        balance_sol: { type: 'number', example: 1.25 },
                        balance_lamports: { type: 'integer', example: 1250000000 },
                    },
                },
                // ── Errors ───────────────────────────────────────
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'object',
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: ['invalid_request_error', 'not_found_error', 'api_error', 'authentication_error'],
                                    example: 'invalid_request_error',
                                },
                                message: { type: 'string', example: "'cost_usd' is required and must be a positive number." },
                            },
                        },
                    },
                },
            },
        },
        tags: [
            { name: 'Health', description: 'Server and network health checks' },
            { name: 'Registry', description: 'Register and discover paid API services' },
            { name: 'Charges', description: 'Create and retrieve micro-payment charges with Solana transactions' },
            { name: 'Network', description: 'Solana Devnet metrics and wallet balances' },
        ],
        paths: {
            // ── Health ───────────────────────────────────────────
            '/api/v1/health': {
                get: {
                    tags: ['Health'],
                    summary: 'Health check',
                    description: 'Returns server status, version, and current timestamp. No auth required.',
                    operationId: 'getHealth',
                    responses: {
                        200: {
                            description: 'Server is healthy',
                            content: { 'application/json': { schema: { '$ref': '#/components/schemas/HealthResponse' } } },
                        },
                    },
                },
            },
            '/api/v1/network/status': {
                get: {
                    tags: ['Network'],
                    summary: 'Solana Devnet network status',
                    description: 'Returns current slot, block height, live SOL/USD price, and operational status. No auth required.',
                    operationId: 'getNetworkStatus',
                    responses: {
                        200: {
                            description: 'Network status',
                            content: { 'application/json': { schema: { '$ref': '#/components/schemas/NetworkStatusResponse' } } },
                        },
                    },
                },
            },
            '/api/v1/balance/{wallet}': {
                get: {
                    tags: ['Network'],
                    summary: 'Get wallet SOL balance',
                    description: 'Returns the SOL and lamport balance for any Solana Devnet wallet address.',
                    operationId: 'getWalletBalance',
                    security: [{ BearerAuth: [] }],
                    parameters: [
                        {
                            name: 'wallet',
                            in: 'path',
                            required: true,
                            description: 'Base58-encoded Solana public key',
                            schema: { type: 'string', example: 'DRtXHDgC312wNUSxNRnV2iarFh5Sk5VpTBGoAdnGmWbm' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Wallet balance',
                            content: { 'application/json': { schema: { '$ref': '#/components/schemas/WalletBalanceResponse' } } },
                        },
                        400: {
                            description: 'Invalid wallet address',
                            content: { 'application/json': { schema: { '$ref': '#/components/schemas/ErrorResponse' } } },
                        },
                        401: { description: 'Unauthorized' },
                    },
                },
            },
            // ── Registry ─────────────────────────────────────────
            '/api/v1/registry/register': {
                post: {
                    tags: ['Registry'],
                    summary: 'Register a new paid API service',
                    description: 'Adds an API service to the registry so AI agents can discover and pay for it. Requires auth.',
                    operationId: 'registerService',
                    security: [{ BearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { '$ref': '#/components/schemas/RegisterServiceRequest' },
                                examples: {
                                    weather: {
                                        summary: 'Weather API',
                                        value: {
                                            name: 'Live Weather API',
                                            description: 'Real-time temperature and precipitation data for any city',
                                            endpoint: 'https://weather-api.example.com/v1/current',
                                            cost_usd: 0.01,
                                            developer_wallet: 'BRjpCHtyQLeSN69hKudVoRGuKXn5VEe2e8cqGKzpdBag',
                                        },
                                    },
                                    stocks: {
                                        summary: 'Stock Price API',
                                        value: {
                                            name: 'Real-Time Stock Prices',
                                            description: 'Live NASDAQ and NYSE stock quotes with sub-second latency',
                                            endpoint: 'https://stocks-api.example.com/v2/quote',
                                            cost_usd: 0.005,
                                            developer_wallet: 'BRjpCHtyQLeSN69hKudVoRGuKXn5VEe2e8cqGKzpdBag',
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Service registered successfully',
                            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Service' } } },
                        },
                        400: {
                            description: 'Validation error',
                            content: { 'application/json': { schema: { '$ref': '#/components/schemas/ErrorResponse' } } },
                        },
                        401: { description: 'Missing or invalid API key' },
                    },
                },
            },
            '/api/v1/registry/discover': {
                get: {
                    tags: ['Registry'],
                    summary: 'Discover registered services',
                    description: 'Returns all registered API services. Optionally filter by name or description with `?query=`. No auth required.',
                    operationId: 'discoverServices',
                    parameters: [
                        {
                            name: 'query',
                            in: 'query',
                            required: false,
                            description: 'Search term to filter by name or description (case-insensitive)',
                            schema: { type: 'string', example: 'weather' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'List of matching services',
                            content: { 'application/json': { schema: { '$ref': '#/components/schemas/ServiceList' } } },
                        },
                    },
                },
            },
            '/api/v1/registry/services/{id}': {
                get: {
                    tags: ['Registry'],
                    summary: 'Get a service by ID',
                    description: 'Retrieves a single registered service by its ID. No auth required.',
                    operationId: 'getServiceById',
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            description: 'Service ID (e.g. srv_a8f2k9x1b3m7)',
                            schema: { type: 'string', example: 'srv_a8f2k9x1b3m7' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Service object',
                            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Service' } } },
                        },
                        404: {
                            description: 'Service not found',
                            content: { 'application/json': { schema: { '$ref': '#/components/schemas/ErrorResponse' } } },
                        },
                    },
                },
            },
            // ── Charges ──────────────────────────────────────────
            '/api/v1/charges': {
                post: {
                    tags: ['Charges'],
                    summary: 'Create a charge (generate Solana transaction)',
                    description: `Creates a micro-payment charge for a registered API service.

**Flow:**
1. Looks up the service by ID and gets its \`cost_usd\` and \`developer_wallet\`
2. Fetches the live SOL/USD price from CoinGecko
3. Converts \`cost_usd → amount_sol\`
4. Builds an unsigned Solana transfer transaction (Devnet)
5. Returns the charge with a Base64 \`transaction_payload\` ready for Phantom to sign

**Idempotency:** Pass an \`Idempotency-Key\` header to safely retry without creating duplicate charges.`,
                    operationId: 'createCharge',
                    security: [{ BearerAuth: [] }],
                    parameters: [
                        {
                            name: 'Idempotency-Key',
                            in: 'header',
                            required: false,
                            description: 'Optional unique key to make this request idempotent — same key returns the same charge',
                            schema: { type: 'string', example: 'my-agent-request-uuid-001' },
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { '$ref': '#/components/schemas/CreateChargeRequest' },
                                example: {
                                    service_id: 'srv_a8f2k9x1b3m7',
                                    source_wallet: 'DRtXHDgC312wNUSxNRnV2iarFh5Sk5VpTBGoAdnGmWbm',
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Charge created — sign transaction_payload with Phantom wallet',
                            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Charge' } } },
                        },
                        400: {
                            description: 'Validation error',
                            content: { 'application/json': { schema: { '$ref': '#/components/schemas/ErrorResponse' } } },
                        },
                        401: { description: 'Missing or invalid API key' },
                        404: {
                            description: 'Service not found',
                            content: { 'application/json': { schema: { '$ref': '#/components/schemas/ErrorResponse' } } },
                        },
                        500: {
                            description: 'Price oracle or transaction build failure',
                            content: { 'application/json': { schema: { '$ref': '#/components/schemas/ErrorResponse' } } },
                        },
                    },
                },
                get: {
                    tags: ['Charges'],
                    summary: 'List charges',
                    description: 'Returns a paginated list of all charges. Supports filtering by `status` and `source_wallet`.',
                    operationId: 'listCharges',
                    security: [{ BearerAuth: [] }],
                    parameters: [
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 100 }, description: 'Max results to return' },
                        { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 }, description: 'Number of results to skip' },
                        { name: 'status', in: 'query', schema: { type: 'string', example: 'requires_signature' }, description: 'Filter by charge status' },
                        { name: 'source_wallet', in: 'query', schema: { type: 'string', example: 'DRtXHDgC312wNUSxNRnV2iarFh5Sk5VpTBGoAdnGmWbm' }, description: 'Filter by consumer wallet address' },
                    ],
                    responses: {
                        200: {
                            description: 'Paginated list of charges',
                            content: { 'application/json': { schema: { '$ref': '#/components/schemas/ChargeList' } } },
                        },
                        401: { description: 'Unauthorized' },
                    },
                },
            },
            '/api/v1/charges/{id}': {
                get: {
                    tags: ['Charges'],
                    summary: 'Get a charge by ID',
                    description: 'Retrieves a single charge by its ID.',
                    operationId: 'getChargeById',
                    security: [{ BearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            description: 'Charge ID (e.g. ch_a8f2k9x1b3m7)',
                            schema: { type: 'string', example: 'ch_a8f2k9x1b3m7' },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Charge object',
                            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Charge' } } },
                        },
                        401: { description: 'Unauthorized' },
                        404: {
                            description: 'Charge not found',
                            content: { 'application/json': { schema: { '$ref': '#/components/schemas/ErrorResponse' } } },
                        },
                    },
                },
            },
        },
    },
    apis: [], // All paths defined inline above
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
