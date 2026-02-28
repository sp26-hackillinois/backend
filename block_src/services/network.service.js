const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getSolPriceInUsd } = require('./price.service');

const connection = new Connection('https://api.devnet.solana.com', 'finalized');

/**
 * Returns the SOL and lamport balance for a given wallet address.
 * @param {string} walletAddress Base58-encoded Solana public key
 * @returns {Promise<{ wallet: string, balance_sol: number, balance_lamports: number }>}
 */
async function getWalletBalance(walletAddress) {
    const pubkey = new PublicKey(walletAddress); // throws if invalid
    const lamports = await connection.getBalance(pubkey);
    const balanceSol = lamports / LAMPORTS_PER_SOL;
    return {
        wallet: walletAddress,
        balance_sol: balanceSol,
        balance_lamports: lamports,
    };
}

/**
 * Returns current Solana Devnet network metrics and SOL price.
 * Degrades gracefully — returns status "degraded" if any call fails.
 * @returns {Promise<object>}
 */
async function getNetworkStatus() {
    let current_slot = null;
    let block_height = null;
    let sol_price_usd = null;
    let status = 'operational';

    try {
        [current_slot, block_height, sol_price_usd] = await Promise.all([
            connection.getSlot(),
            connection.getBlockHeight(),
            getSolPriceInUsd(),
        ]);
    } catch (error) {
        console.error(`[Network Service] Error fetching network status: ${error.message}`);
        status = 'degraded';

        // Attempt partial data collection if one call failed
        try { if (current_slot === null) current_slot = await connection.getSlot(); } catch (_) { }
        try { if (block_height === null) block_height = await connection.getBlockHeight(); } catch (_) { }
        try { if (sol_price_usd === null) sol_price_usd = await getSolPriceInUsd(); } catch (_) { }
    }

    return {
        network: 'devnet',
        current_slot,
        block_height,
        sol_price_usd,
        avg_fee_sol: 0.000005,
        status,
    };
}

module.exports = { getWalletBalance, getNetworkStatus };
