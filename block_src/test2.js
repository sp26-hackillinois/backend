require('dotenv').config({ path: '../.env' }); // Load .env from parent directory
const { Connection, Keypair, Transaction } = require('@solana/web3.js');
const bs58 = require('bs58').default || require('bs58');
const { buildUnsignedTransaction } = require('./services/solana.service');

// Keys loaded from .env
const AI_CONSUMER_WALLET = process.env.AI_CONSUMER_WALLET;
const AI_CONSUMER_WALLET_PRIVATE = process.env.AI_CONSUMER_WALLET_PRIVATE;
const TOOL_DEVELOPER_WALLET = process.env.TOOL_DEVELOPER_WALLET;

async function runEndToEndTest() {
    console.log("🚀 Starting End-to-End Payment Simulation...");

    try {
        if (!AI_CONSUMER_WALLET_PRIVATE) {
            throw new Error("Missing AI_CONSUMER_WALLET_PRIVATE in .env file");
        }

        let consumerWallet;
        try {
            // First try parsing as a JSON array format (e.g. [1, 2, 3...]) which is common for Solana wallets
            const privateKeyArray = JSON.parse(AI_CONSUMER_WALLET_PRIVATE);
            consumerWallet = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));
        } catch (e) {
            // Fallback to bs58 string decoding
            // Some .env loaders include bounding quotes if the user put them in the .env file
            const cleanedKey = AI_CONSUMER_WALLET_PRIVATE.trim().replace(/^["']|["']$/g, '');
            console.log(`[Debug] Cleaned key length: ${cleanedKey.length}`);
            console.log(`[Debug] Full cleaned key: "${cleanedKey}"`);
            consumerWallet = Keypair.fromSecretKey(bs58.decode(cleanedKey));
        }

        const consumerPublicKeyStr = consumerWallet.publicKey.toString();
        console.log(`✅ Loaded AI Consumer Wallet: ${consumerPublicKeyStr}`);

        // 2. Call your service to get the Base64 string (Simulating the API response)
        console.log("\n📦 Backend generating transaction payload for 0.05 SOL...");
        const base64Tx = await buildUnsignedTransaction(
            AI_CONSUMER_WALLET,
            TOOL_DEVELOPER_WALLET,
            0.05
        );

        // 3. Decode the Base64 string back into a Transaction object (Simulating the Frontend)
        console.log("🔓 Frontend decoding payload...");
        const transactionBuffer = Buffer.from(base64Tx, 'base64');
        const transaction = Transaction.from(transactionBuffer);

        // 4. Sign the transaction (Simulating the Phantom Wallet popup approval)
        console.log("✍️ Simulating User clicking 'Approve' in Phantom...");
        transaction.sign(consumerWallet);

        // 5. Broadcast to Solana Devnet
        console.log("🌐 Broadcasting to Devnet...");
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        const signature = await connection.sendRawTransaction(transaction.serialize());

        console.log("\n🎉 BOOM! Transaction Successful!");
        console.log(`🔍 Verify on Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    } catch (error) {
        console.error("\n❌ TEST FAILED:", error);
    }
}

runEndToEndTest();