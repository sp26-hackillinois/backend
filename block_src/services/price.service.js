const axios = require('axios');

let cachedPrice = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60000; // 60 seconds
const FALLBACK_PRICE = 150;

/**
 * Fetches the live SOL price in USD with in-memory caching and fallback.
 * @returns {Promise<number>} SOL price in USD
 */
async function getSolPriceInUsd() {
  const now = Date.now();
  
  if (cachedPrice && (now - lastFetchTime < CACHE_TTL_MS)) {
    return cachedPrice;
  }

  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'solana',
        vs_currencies: 'usd'
      }
    });

    if (response.data && response.data.solana && response.data.solana.usd) {
      cachedPrice = response.data.solana.usd;
      lastFetchTime = now;
      return cachedPrice;
    }
    
    throw new Error('Invalid response structure from price oracle');
  } catch (error) {
    console.error(`[Price Service] Failed to fetch price: ${error.message}`);
    // Fallback to hardcoded value if API fails
    return cachedPrice || FALLBACK_PRICE;
  }
}

module.exports = {
  getSolPriceInUsd
};
