const { buildUnsignedTransaction } = require('./services/solana.service.js');

// TODO: Paste your Phantom wallet public keys here!
const AI_CONSUMER_WALLET = process.env.AI_CONSUMER_WALLET;
const TOOL_DEVELOPER_WALLET = process.env.TOOL_DEVELOPER_WALLET;

// We will test sending exactly 0.05 SOL
const TEST_AMOUNT_SOL = 0.05;

async function runTest() {
    console.log("🚀 Starting Solana Service Test...");
    try {
        console.log(`Building transaction: ${TEST_AMOUNT_SOL} SOL from Consumer to Developer...`);

        const base64Payload = await buildUnsignedTransaction(
            AI_CONSUMER_WALLET,
            TOOL_DEVELOPER_WALLET,
            TEST_AMOUNT_SOL
        );

        console.log("\n✅ SUCCESS! Here is the Base64 Payload that will go to the frontend:");
        console.log("--------------------------------------------------");
        console.log(base64Payload);
        console.log("--------------------------------------------------");
        console.log("\nIf you see a long string of random characters above, your code works perfectly.");

    } catch (error) {
        console.error("❌ TEST FAILED:", error);
    }
}

runTest();