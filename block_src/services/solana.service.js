const {
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
    LAMPORTS_PER_SOL
} = require('@solana/web3.js');

// Connect to Devnet
const connection = new Connection('https://api.devnet.solana.com', 'finalized');

/**
 * Builds an unsigned Solana transfer transaction and serializes it to Base64.
 * @param {string} consumerPubkey Base58 public key of the user (sender/fee payer)
 * @param {string} developerPubkey Base58 public key of the merchant (recipient)
 * @param {number} amountInSol Amount of SOL to transfer
 * @returns {Promise<string>} Base64 encoded serialized transaction
 */
async function buildUnsignedTransaction(consumerPubkey, developerPubkey, amountInSol) {
    try {
        const sender = new PublicKey(consumerPubkey);
        const recipient = new PublicKey(developerPubkey);
        const lamports = Math.round(amountInSol * LAMPORTS_PER_SOL);

        // Fetch recent blockhash for transaction expiration
        const { blockhash } = await connection.getLatestBlockhash({
            commitment: 'finalized'
        });

        const transaction = new Transaction({
            recentBlockhash: blockhash,
            feePayer: sender // Consumer pays the transaction fee
        });

        const transferInstruction = SystemProgram.transfer({
            fromPubkey: sender,
            toPubkey: recipient,
            lamports: lamports
        });

        transaction.add(transferInstruction);

        // Serialize without signatures, as Phantom wallet will sign it on the client
        const serializedTx = transaction.serialize({ requireAllSignatures: false });

        return serializedTx.toString('base64');
    } catch (error) {
        console.error(`[Solana Service] Error building transaction: ${error.message}`);
        throw new Error(`Failed to build transaction: ${error.message}`);
    }
}

module.exports = {
    buildUnsignedTransaction
};
