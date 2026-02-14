// Use current directory (package.json main)
const { JupPredict, MARKET_EVENTS } = require('./dist/cjs/index.js');

async function main() {
    console.log('--- Verifying Jup-Predict SDK ---');

    // 1. Initialize SDK
    console.log('1. Initializing SDK...');
    const sdk = new JupPredict('test_program_id');

    if (sdk.session && sdk.market) {
        console.log('✅ SDK Initialized');
    } else {
        console.error('❌ SDK Initialization Failed');
        process.exit(1);
    }

    // 2. Test Market Impulse
    console.log('2. Testing Market Impulse Engine...');

    const impulsePromise = new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.error('❌ Market Event Timeout');
            resolve(false);
        }, 5000);

        sdk.market.on(MARKET_EVENTS.IMPULSE_UPDATE, (data) => {
            clearTimeout(timeout);
            console.log('✅ Received Market Update:', data);

            if (data.impulseScore >= 0 && data.volume24h > 0) {
                console.log('✅ Data integrity check passed');
                resolve(true);
            }
        });
    });

    sdk.market.startPolling(500);
    const success = await impulsePromise;
    sdk.market.stopPolling();

    if (success) {
        console.log('\n✨ All Verify Checks Passed!');
    } else {
        console.error('\n❌ Verification Failed');
        process.exit(1);
    }
}

main().catch(console.error);
