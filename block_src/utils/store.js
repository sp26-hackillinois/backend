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

function generateChargeId() { return 'ch_' + _randomString(12); }
function generateServiceId() { return 'srv_' + _randomString(12); }
function generateRequestId() { return 'req_' + _randomString(12); }

// ─────────────────────────────────────────
// Charge Store
// ─────────────────────────────────────────

const chargeStore = new Map();

/**
 * Creates and stores a new charge object.
 * @param {object} chargeData
 * @returns {object} Full charge with id, object type, and created_at
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
 * @param {{ limit?: number, offset?: number, status?: string, source_wallet?: string }} options
 * @returns {{ data: object[], has_more: boolean, total_count: number, limit: number, offset: number }}
 */
function listCharges({ limit = 10, offset = 0, status, source_wallet } = {}) {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safeOffset = Math.max(0, offset);

    let all = Array.from(chargeStore.values());
    if (status) all = all.filter(c => c.status === status);
    if (source_wallet) all = all.filter(c => c.source_wallet === source_wallet);

    const total_count = all.length;
    const data = all.slice(safeOffset, safeOffset + safeLimit);
    const has_more = safeOffset + safeLimit < total_count;

    return { data, has_more, total_count, limit: safeLimit, offset: safeOffset };
}

// ─────────────────────────────────────────
// Registry Store
// ─────────────────────────────────────────

const registryStore = new Map();

/**
 * Registers and stores a new service object.
 * If serviceData contains an `id` field, it is used as the Map key (for seeding).
 * Otherwise a new srv_ ID is auto-generated.
 *
 * Services do NOT store cost_usd — pricing is dynamic per charge request.
 *
 * @param {object} serviceData
 * @returns {object} Full service with id, object type, and created_at
 */
function registerService(serviceData) {
    // Allow callers to pass a fixed id (used for seed data)
    const id = serviceData.id || generateServiceId();
    const { id: _ignored, ...rest } = serviceData; // strip any incoming id to avoid duplication
    const service = {
        id,
        object: 'service',
        created_at: new Date().toISOString(),
        ...rest,
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
    const all = Array.from(registryStore.values());
    if (!query || query.trim() === '') return all;

    const q = query.toLowerCase();
    return all.filter(s => {
        if (s.name && s.name.toLowerCase().includes(q)) return true;
        if (s.description && s.description.toLowerCase().includes(q)) return true;
        if (Array.isArray(s.tags) && s.tags.some(t => t.toLowerCase().includes(q))) return true;
        return false;
    });
}

function deleteService(id) {
    return registryStore.delete(id);
}

// ─────────────────────────────────────────
// Idempotency Store
// ─────────────────────────────────────────

const idempotencyStore = new Map();

/** @param {string} key @returns {object|null} */
function getIdempotencyResult(key) {
    return idempotencyStore.get(key) || null;
}

/** @param {string} key @param {object} responseBody */
function setIdempotencyResult(key, responseBody) {
    idempotencyStore.set(key, responseBody);
    setTimeout(() => idempotencyStore.delete(key), 24 * 60 * 60 * 1000);
}

// ─────────────────────────────────────────
// Seed Data (26 services — no cost_usd)
// ─────────────────────────────────────────

const DEVELOPER_WALLET = '2Hn6ESeMRqfVDTptanXgK6vDEpgJGnp4rG6Ls3dzszv8';

const SEED_SERVICES = [
    {
        id: 'weather_openmeteo',
        name: 'Live Weather (Open-Meteo)',
        category: 'Weather',
        description: 'Real-time temperature, humidity, and precipitation data from Open-Meteo for any city worldwide.',
        endpoint: 'GET /tools/weather/openmeteo',
        tags: ['weather', 'temperature', 'humidity', 'precipitation', 'open-meteo'],
    },
    {
        id: 'weather_openweather',
        name: 'Live Weather (OpenWeather)',
        category: 'Weather',
        description: 'Real-time weather conditions including wind speed, visibility, and UV index via OpenWeather API.',
        endpoint: 'GET /tools/weather/openweather',
        tags: ['weather', 'temperature', 'wind', 'uv', 'openweather'],
    },
    {
        id: 'weather_forecast',
        name: '7-Day Weather Forecast',
        category: 'Weather',
        description: 'Extended 7-day weather forecast with daily highs, lows, and precipitation probability.',
        endpoint: 'GET /tools/weather/forecast',
        tags: ['forecast', 'weekly', 'weather', '7day', 'prediction'],
    },
    {
        id: 'finance_crypto',
        name: 'Crypto Price Oracle',
        category: 'Finance',
        description: 'Live SOL/USD, BTC/USD, ETH/USD price feeds with 1-minute granularity.',
        endpoint: 'GET /tools/finance/crypto',
        tags: ['crypto', 'bitcoin', 'solana', 'ethereum', 'price', 'defi'],
    },
    {
        id: 'finance_stocks',
        name: 'Stock Price Feed',
        category: 'Finance',
        description: 'Live equity prices, volume, and market cap from NYSE and NASDAQ.',
        endpoint: 'GET /tools/finance/stocks',
        tags: ['stocks', 'equity', 'market', 'trading', 'NYSE', 'NASDAQ'],
    },
    {
        id: 'finance_forex',
        name: 'Forex Exchange Rates',
        category: 'Finance',
        description: 'Real-time foreign exchange rates for 170+ currency pairs.',
        endpoint: 'GET /tools/finance/forex',
        tags: ['forex', 'currency', 'exchange', 'USD', 'EUR'],
    },
    {
        id: 'news_breaking',
        name: 'Breaking News Headlines',
        category: 'News',
        description: 'Breaking news and top headlines across 50+ categories and 30+ countries.',
        endpoint: 'GET /tools/news/breaking',
        tags: ['news', 'breaking', 'headlines', 'world', 'current events'],
    },
    {
        id: 'news_search',
        name: 'News Search',
        category: 'News',
        description: 'Search millions of news articles by keyword, date range, and source.',
        endpoint: 'GET /tools/news/search',
        tags: ['news', 'search', 'articles', 'journalism', 'media'],
    },
    {
        id: 'search_web',
        name: 'Web Search API',
        category: 'Search',
        description: 'Returns top 10 search results for any query with titles, URLs, and snippets.',
        endpoint: 'GET /tools/search/web',
        tags: ['search', 'web', 'google', 'results', 'internet'],
    },
    {
        id: 'search_images',
        name: 'Image Search API',
        category: 'Search',
        description: 'Search for images across the web with size, color, and license filters.',
        endpoint: 'GET /tools/search/images',
        tags: ['search', 'images', 'photos', 'visual', 'media'],
    },
    {
        id: 'openai_chat',
        name: 'OpenAI Chat Completions',
        category: 'AI',
        description: 'Access GPT-4o chat completions for any prompt. Pay per request, no subscription needed.',
        endpoint: 'POST /tools/openai-chat',
        tags: ['openai', 'gpt', 'chat', 'ai', 'llm', 'completions'],
    },
    {
        id: 'nlp_sentiment',
        name: 'Sentiment Analysis',
        category: 'NLP',
        description: 'Analyze the sentiment of any text. Returns positive, negative, or neutral with confidence score.',
        endpoint: 'GET /tools/nlp/sentiment',
        tags: ['nlp', 'sentiment', 'analysis', 'text', 'opinion'],
    },
    {
        id: 'nlp_summarize',
        name: 'Text Summarizer',
        category: 'NLP',
        description: 'Summarize long articles, documents, or web pages into concise key points.',
        endpoint: 'GET /tools/nlp/summarize',
        tags: ['nlp', 'summarize', 'text', 'abstract', 'tldr'],
    },
    {
        id: 'nlp_translate',
        name: 'Language Translator',
        category: 'NLP',
        description: 'Translate text between 100+ languages with auto-detection of source language.',
        endpoint: 'GET /tools/nlp/translate',
        tags: ['nlp', 'translate', 'language', 'localization', 'i18n'],
    },
    {
        id: 'nlp_extract',
        name: 'Entity Extractor',
        category: 'NLP',
        description: 'Extract named entities (people, places, organizations, dates) from unstructured text.',
        endpoint: 'GET /tools/nlp/extract',
        tags: ['nlp', 'entities', 'extraction', 'ner', 'text'],
    },
    {
        id: 'sports_scores',
        name: 'Live Sports Scores',
        category: 'Sports',
        description: 'Live scores and game status for NFL, NBA, MLB, NHL, and Premier League.',
        endpoint: 'GET /tools/sports/scores',
        tags: ['sports', 'scores', 'live', 'nfl', 'nba', 'mlb'],
    },
    {
        id: 'sports_stats',
        name: 'Player & Team Stats',
        category: 'Sports',
        description: 'Historical and season statistics for players and teams across major leagues.',
        endpoint: 'GET /tools/sports/stats',
        tags: ['sports', 'stats', 'players', 'teams', 'analytics'],
    },
    {
        id: 'food_recipes',
        name: 'Recipe Search',
        category: 'Food',
        description: 'Search thousands of recipes by ingredient, cuisine, dietary restriction, or meal type.',
        endpoint: 'GET /tools/food/recipes',
        tags: ['food', 'recipes', 'cooking', 'cuisine', 'meals'],
    },
    {
        id: 'food_nutrition',
        name: 'Nutrition Data',
        category: 'Food',
        description: 'Detailed nutritional information for any food item including macros, vitamins, and minerals.',
        endpoint: 'GET /tools/food/nutrition',
        tags: ['food', 'nutrition', 'calories', 'macros', 'health'],
    },
    {
        id: 'travel_flights',
        name: 'Flight Search',
        category: 'Travel',
        description: 'Search for flights between any two airports with real-time pricing and availability.',
        endpoint: 'GET /tools/travel/flights',
        tags: ['travel', 'flights', 'airlines', 'booking', 'airports'],
    },
    {
        id: 'travel_hotels',
        name: 'Hotel Search',
        category: 'Travel',
        description: 'Search for hotels by city, dates, and guest count with live pricing and ratings.',
        endpoint: 'GET /tools/travel/hotels',
        tags: ['travel', 'hotels', 'accommodation', 'booking', 'lodging'],
    },
    {
        id: 'blockchain_wallet',
        name: 'Wallet Balance Checker',
        category: 'Blockchain',
        description: 'Check SOL, ETH, and major token balances for any wallet address across chains.',
        endpoint: 'GET /tools/blockchain/wallet',
        tags: ['blockchain', 'wallet', 'balance', 'solana', 'ethereum'],
    },
    {
        id: 'blockchain_nft',
        name: 'NFT Metadata Lookup',
        category: 'Blockchain',
        description: 'Fetch metadata, ownership history, and floor price for any NFT by mint address.',
        endpoint: 'GET /tools/blockchain/nft',
        tags: ['blockchain', 'nft', 'metadata', 'collectibles', 'mint'],
    },
    {
        id: 'blockchain_defi',
        name: 'DeFi Protocol Stats',
        category: 'Blockchain',
        description: 'TVL, APY, and pool data for major DeFi protocols on Solana and Ethereum.',
        endpoint: 'GET /tools/blockchain/defi',
        tags: ['blockchain', 'defi', 'tvl', 'apy', 'yield', 'solana'],
    },
    {
        id: 'data_demographics',
        name: 'Demographics Data',
        category: 'Data',
        description: 'Population, income, education, and age distribution data for any US zip code or city.',
        endpoint: 'GET /tools/data/demographics',
        tags: ['data', 'demographics', 'population', 'census', 'statistics'],
    },
    {
        id: 'data_github',
        name: 'GitHub Repo Analytics',
        category: 'Data',
        description: 'Stars, forks, contributors, commit frequency, and language breakdown for any GitHub repo.',
        endpoint: 'GET /tools/data/github',
        tags: ['data', 'github', 'repos', 'analytics', 'developers', 'open-source'],
    },
];

// Seed all services on startup
for (const svc of SEED_SERVICES) {
    registerService({ ...svc, developer_wallet: DEVELOPER_WALLET });
}
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
    deleteService,
    // Idempotency store
    getIdempotencyResult,
    setIdempotencyResult,
};
