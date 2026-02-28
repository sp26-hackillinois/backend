/**
 * store.js — In-memory data layer for Micropay Bazaar.
 * All data resets on server restart. Intentional for hackathon use.
 */

// ─────────────────────────────────────────
// ID Generators
// ─────────────────────────────────────────

const CHARSET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function _randomString(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += CHARSET[Math.floor(Math.random() * CHARSET.length)];
    }
    return result;
}

function generateChargeId() {
    return 'ch_' + _randomString(12);
}

function generateServiceId() {
    return 'srv_' + _randomString(12);
}

function generateRequestId() {
    return 'req_' + _randomString(12);
}

// ─────────────────────────────────────────
// Charge Store
// ─────────────────────────────────────────

const chargeStore = new Map();

/**
 * Creates and stores a new charge object.
 * @param {object} chargeData - Partial charge data (no id/object/created_at)
 * @returns {object} Full charge object with generated id, object type, and timestamp
 */
function createCharge(chargeData) {
    const id = generateChargeId();
    const charge = {
        id,
        object: 'charge',
        created_at: new Date().toISOString(),
        ...chargeData,
    };
    chargeStore.set(id, charge);
    return charge;
}

/**
 * Retrieves a charge by its ID.
 * @param {string} id
 * @returns {object|null}
 */
function getChargeById(id) {
    return chargeStore.get(id) || null;
}

/**
 * Lists charges with optional filtering and pagination.
 * @param {object} options
 * @param {number} [options.limit=10]
 * @param {number} [options.offset=0]
 * @param {string} [options.status]
 * @param {string} [options.source_wallet]
 * @returns {{ data: object[], has_more: boolean, total_count: number, limit: number, offset: number }}
 */
function listCharges({ limit = 10, offset = 0, status, source_wallet } = {}) {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safeOffset = Math.max(0, offset);

    let allCharges = Array.from(chargeStore.values());

    // Apply filters
    if (status) {
        allCharges = allCharges.filter(c => c.status === status);
    }
    if (source_wallet) {
        allCharges = allCharges.filter(c => c.source_wallet === source_wallet);
    }

    const total_count = allCharges.length;
    const paginated = allCharges.slice(safeOffset, safeOffset + safeLimit);
    const has_more = safeOffset + safeLimit < total_count;

    return {
        data: paginated,
        has_more,
        total_count,
        limit: safeLimit,
        offset: safeOffset,
    };
}

// ─────────────────────────────────────────
// Registry Store
// ─────────────────────────────────────────

const registryStore = new Map();

/**
 * Registers and stores a new service object.
 * If serviceData includes a `service_id`, uses that as the key.
 * Otherwise generates a random srv_ ID.
 * @param {object} serviceData
 * @returns {object} Full service object with id, object type, and timestamp
 */
function registerService(serviceData) {
    const id = serviceData.service_id || generateServiceId();
    const service = {
        id,
        object: 'service',
        created_at: new Date().toISOString(),
        ...serviceData,
        service_id: undefined, // remove duplicate field, `id` is the canonical key
    };
    registryStore.set(id, service);
    return service;
}

/**
 * Retrieves a service by its ID.
 * @param {string} id
 * @returns {object|null}
 */
function getServiceById(id) {
    return registryStore.get(id) || null;
}

/**
 * Discovers services, optionally filtered by a search query.
 * Matches against `name`, `description`, and `tags` fields (case-insensitive).
 * @param {string} [query]
 * @returns {object[]}
 */
function discoverServices(query) {
    const allServices = Array.from(registryStore.values());
    if (!query || query.trim() === '') {
        return allServices;
    }
    const lowerQuery = query.toLowerCase();
    return allServices.filter(s =>
        (s.name && s.name.toLowerCase().includes(lowerQuery)) ||
        (s.description && s.description.toLowerCase().includes(lowerQuery)) ||
        (s.tags && s.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
    );
}

// ─────────────────────────────────────────
// Idempotency Store
// ─────────────────────────────────────────

const idempotencyStore = new Map();

/**
 * Retrieves a cached response for an idempotency key.
 * @param {string} key
 * @returns {object|null}
 */
function getIdempotencyResult(key) {
    return idempotencyStore.get(key) || null;
}

/**
 * Stores a response body for an idempotency key.
 * @param {string} key
 * @param {object} responseBody
 */
function setIdempotencyResult(key, responseBody) {
    idempotencyStore.set(key, responseBody);
}

// ─────────────────────────────────────────
// Seed Data — 26 Hardcoded Demo Services
// ─────────────────────────────────────────

const DEFAULT_WALLET = 'AuofYo21iiX8NQtgWBXLRFMiWfv83z2CbnhPNen6WNt5';

const SEED_SERVICES = [
    {
        service_id: 'weather_openmeteo',
        name: 'Live Weather (Open-Meteo)',
        category: 'Weather',
        description: 'Real-time temperature, humidity, and precipitation data from Open-Meteo for any city worldwide.',
        endpoint: 'GET /tools/weather/openmeteo',
        cost_usd: 0.01,
        developer_wallet: DEFAULT_WALLET,
        tags: ['weather', 'temperature', 'humidity', 'precipitation', 'open-meteo'],
    },
    {
        service_id: 'weather_openweather',
        name: 'Live Weather (OpenWeather)',
        category: 'Weather',
        description: 'Real-time weather conditions including wind speed, visibility, and UV index via OpenWeather API.',
        endpoint: 'GET /tools/weather/openweather',
        cost_usd: 0.01,
        developer_wallet: DEFAULT_WALLET,
        tags: ['weather', 'temperature', 'wind', 'uv', 'openweather'],
    },
    {
        service_id: 'weather_forecast',
        name: '7-Day Weather Forecast',
        category: 'Weather',
        description: 'Extended 7-day weather forecast with daily highs, lows, and precipitation probability.',
        endpoint: 'GET /tools/weather/forecast',
        cost_usd: 0.02,
        developer_wallet: DEFAULT_WALLET,
        tags: ['forecast', 'weekly', 'weather', '7day', 'prediction'],
    },
    {
        service_id: 'finance_crypto',
        name: 'Crypto Price Oracle',
        category: 'Finance',
        description: 'Live SOL/USD, BTC/USD, ETH/USD price feeds with 1-minute granularity.',
        endpoint: 'GET /tools/finance/crypto',
        cost_usd: 0.01,
        developer_wallet: DEFAULT_WALLET,
        tags: ['crypto', 'bitcoin', 'solana', 'ethereum', 'price', 'defi'],
    },
    {
        service_id: 'finance_stocks',
        name: 'Stock Price Feed',
        category: 'Finance',
        description: 'Live equity prices, volume, and market cap from NYSE and NASDAQ.',
        endpoint: 'GET /tools/finance/stocks',
        cost_usd: 0.02,
        developer_wallet: DEFAULT_WALLET,
        tags: ['stocks', 'equity', 'market', 'trading', 'NYSE', 'NASDAQ'],
    },
    {
        service_id: 'finance_forex',
        name: 'Forex Exchange Rates',
        category: 'Finance',
        description: 'Real-time foreign exchange rates for 170+ currency pairs.',
        endpoint: 'GET /tools/finance/forex',
        cost_usd: 0.01,
        developer_wallet: DEFAULT_WALLET,
        tags: ['forex', 'currency', 'exchange', 'USD', 'EUR'],
    },
    {
        service_id: 'news_breaking',
        name: 'Breaking News Headlines',
        category: 'News',
        description: 'Breaking news and top headlines across 50+ categories and 30+ countries.',
        endpoint: 'GET /tools/news/breaking',
        cost_usd: 0.02,
        developer_wallet: DEFAULT_WALLET,
        tags: ['news', 'breaking', 'headlines', 'world', 'current events'],
    },
    {
        service_id: 'news_search',
        name: 'News Search',
        category: 'News',
        description: 'Search millions of news articles by keyword, date range, and source.',
        endpoint: 'GET /tools/news/search',
        cost_usd: 0.02,
        developer_wallet: DEFAULT_WALLET,
        tags: ['news', 'search', 'articles', 'journalism', 'media'],
    },
    {
        service_id: 'search_web',
        name: 'Web Search API',
        category: 'Search',
        description: 'Returns top 10 search results for any query with titles, URLs, and snippets.',
        endpoint: 'GET /tools/search/web',
        cost_usd: 0.05,
        developer_wallet: DEFAULT_WALLET,
        tags: ['search', 'web', 'google', 'results', 'internet'],
    },
    {
        service_id: 'search_images',
        name: 'Image Search API',
        category: 'Search',
        description: 'Search for images across the web with size, color, and license filters.',
        endpoint: 'GET /tools/search/images',
        cost_usd: 0.03,
        developer_wallet: DEFAULT_WALLET,
        tags: ['search', 'images', 'photos', 'visual', 'media'],
    },
    {
        service_id: 'openai_chat',
        name: 'OpenAI Chat Completions',
        category: 'AI',
        description: 'Access GPT-4o chat completions for any prompt. Pay per request, no subscription needed.',
        endpoint: 'POST /tools/openai-chat',
        cost_usd: 0.05,
        developer_wallet: DEFAULT_WALLET,
        tags: ['openai', 'gpt', 'chat', 'ai', 'llm', 'completions'],
    },
    {
        service_id: 'nlp_sentiment',
        name: 'Sentiment Analysis',
        category: 'NLP',
        description: 'Analyze the sentiment of any text. Returns positive, negative, or neutral with confidence score.',
        endpoint: 'GET /tools/nlp/sentiment',
        cost_usd: 0.01,
        developer_wallet: DEFAULT_WALLET,
        tags: ['nlp', 'sentiment', 'analysis', 'text', 'opinion'],
    },
    {
        service_id: 'nlp_summarize',
        name: 'Text Summarizer',
        category: 'NLP',
        description: 'Summarize long articles, documents, or web pages into concise key points.',
        endpoint: 'GET /tools/nlp/summarize',
        cost_usd: 0.02,
        developer_wallet: DEFAULT_WALLET,
        tags: ['nlp', 'summarize', 'text', 'abstract', 'tldr'],
    },
    {
        service_id: 'nlp_translate',
        name: 'Language Translator',
        category: 'NLP',
        description: 'Translate text between 100+ languages with auto-detection of source language.',
        endpoint: 'GET /tools/nlp/translate',
        cost_usd: 0.02,
        developer_wallet: DEFAULT_WALLET,
        tags: ['nlp', 'translate', 'language', 'localization', 'i18n'],
    },
    {
        service_id: 'nlp_extract',
        name: 'Entity Extractor',
        category: 'NLP',
        description: 'Extract named entities (people, places, organizations, dates) from unstructured text.',
        endpoint: 'GET /tools/nlp/extract',
        cost_usd: 0.01,
        developer_wallet: DEFAULT_WALLET,
        tags: ['nlp', 'entities', 'extraction', 'ner', 'text'],
    },
    {
        service_id: 'sports_scores',
        name: 'Live Sports Scores',
        category: 'Sports',
        description: 'Live scores and game status for NFL, NBA, MLB, NHL, and Premier League.',
        endpoint: 'GET /tools/sports/scores',
        cost_usd: 0.02,
        developer_wallet: DEFAULT_WALLET,
        tags: ['sports', 'scores', 'live', 'nfl', 'nba', 'mlb'],
    },
    {
        service_id: 'sports_stats',
        name: 'Player & Team Stats',
        category: 'Sports',
        description: 'Historical and season statistics for players and teams across major leagues.',
        endpoint: 'GET /tools/sports/stats',
        cost_usd: 0.02,
        developer_wallet: DEFAULT_WALLET,
        tags: ['sports', 'stats', 'players', 'teams', 'analytics'],
    },
    {
        service_id: 'food_recipes',
        name: 'Recipe Search',
        category: 'Food',
        description: 'Search thousands of recipes by ingredient, cuisine, dietary restriction, or meal type.',
        endpoint: 'GET /tools/food/recipes',
        cost_usd: 0.01,
        developer_wallet: DEFAULT_WALLET,
        tags: ['food', 'recipes', 'cooking', 'cuisine', 'meals'],
    },
    {
        service_id: 'food_nutrition',
        name: 'Nutrition Data',
        category: 'Food',
        description: 'Detailed nutritional information for any food item including macros, vitamins, and minerals.',
        endpoint: 'GET /tools/food/nutrition',
        cost_usd: 0.01,
        developer_wallet: DEFAULT_WALLET,
        tags: ['food', 'nutrition', 'calories', 'macros', 'health'],
    },
    {
        service_id: 'travel_flights',
        name: 'Flight Search',
        category: 'Travel',
        description: 'Search for flights between any two airports with real-time pricing and availability.',
        endpoint: 'GET /tools/travel/flights',
        cost_usd: 0.05,
        developer_wallet: DEFAULT_WALLET,
        tags: ['travel', 'flights', 'airlines', 'booking', 'airports'],
    },
    {
        service_id: 'travel_hotels',
        name: 'Hotel Search',
        category: 'Travel',
        description: 'Search for hotels by city, dates, and guest count with live pricing and ratings.',
        endpoint: 'GET /tools/travel/hotels',
        cost_usd: 0.05,
        developer_wallet: DEFAULT_WALLET,
        tags: ['travel', 'hotels', 'accommodation', 'booking', 'lodging'],
    },
    {
        service_id: 'blockchain_wallet',
        name: 'Wallet Balance Checker',
        category: 'Blockchain',
        description: 'Check SOL, ETH, and major token balances for any wallet address across chains.',
        endpoint: 'GET /tools/blockchain/wallet',
        cost_usd: 0.01,
        developer_wallet: DEFAULT_WALLET,
        tags: ['blockchain', 'wallet', 'balance', 'solana', 'ethereum'],
    },
    {
        service_id: 'blockchain_nft',
        name: 'NFT Metadata Lookup',
        category: 'Blockchain',
        description: 'Fetch metadata, ownership history, and floor price for any NFT by mint address.',
        endpoint: 'GET /tools/blockchain/nft',
        cost_usd: 0.02,
        developer_wallet: DEFAULT_WALLET,
        tags: ['blockchain', 'nft', 'metadata', 'collectibles', 'mint'],
    },
    {
        service_id: 'blockchain_defi',
        name: 'DeFi Protocol Stats',
        category: 'Blockchain',
        description: 'TVL, APY, and pool data for major DeFi protocols on Solana and Ethereum.',
        endpoint: 'GET /tools/blockchain/defi',
        cost_usd: 0.02,
        developer_wallet: DEFAULT_WALLET,
        tags: ['blockchain', 'defi', 'tvl', 'apy', 'yield', 'solana'],
    },
    {
        service_id: 'data_demographics',
        name: 'Demographics Data',
        category: 'Data',
        description: 'Population, income, education, and age distribution data for any US zip code or city.',
        endpoint: 'GET /tools/data/demographics',
        cost_usd: 0.03,
        developer_wallet: DEFAULT_WALLET,
        tags: ['data', 'demographics', 'population', 'census', 'statistics'],
    },
    {
        service_id: 'data_github',
        name: 'GitHub Repo Analytics',
        category: 'Data',
        description: 'Stars, forks, contributors, commit frequency, and language breakdown for any GitHub repo.',
        endpoint: 'GET /tools/data/github',
        cost_usd: 0.02,
        developer_wallet: DEFAULT_WALLET,
        tags: ['data', 'github', 'repos', 'analytics', 'developers', 'open-source'],
    },
];

// Seed all demo services on startup
SEED_SERVICES.forEach(service => {
    registerService(service);
});

console.log(`[Store] Seeded ${SEED_SERVICES.length} demo services into registry.`);

// ─────────────────────────────────────────
// Exports
// ─────────────────────────────────────────

module.exports = {
    // ID generators
    generateChargeId,
    generateServiceId,
    generateRequestId,
    // Charge store
    createCharge,
    getChargeById,
    listCharges,
    // Registry store
    registerService,
    getServiceById,
    discoverServices,
    // Idempotency store
    getIdempotencyResult,
    setIdempotencyResult,
};