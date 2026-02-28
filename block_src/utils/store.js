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
 * @param {object} serviceData
 * @returns {object} Full service object with generated id, object type, and timestamp
 */
function registerService(serviceData) {
    const id = generateServiceId();
    const service = {
        id,
        object: 'service',
        created_at: new Date().toISOString(),
        ...serviceData,
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
 * Matches against `name` and `description` fields (case-insensitive).
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
        (s.description && s.description.toLowerCase().includes(lowerQuery))
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
