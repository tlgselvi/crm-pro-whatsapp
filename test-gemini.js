const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

async function testModel(model, version = 'v1') {
    console.log(`Testing model: ${model} (${version})...`);
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Hello, are you there?" }] }]
                }),
            }
        );
        console.log(`Status: ${response.status} ${response.statusText}`);
        if (response.ok) {
            const data = await response.json();
            console.log(`Success! Response snippet: ${JSON.stringify(data).substring(0, 100)}...`);
        } else {
            const err = await response.text();
            console.log(`Error: ${err}`);
        }
    } catch (e) {
        console.error(`Fetch failed: ${e.message}`);
    }
}

async function runTests() {
    if (!GEMINI_API_KEY) {
        console.error("Missing API Key!");
        return;
    }
    await testModel("gemini-1.5-flash", "v1");
    await testModel("gemini-1.5-flash", "v1beta");
    await testModel("gemini-1.5-flash-latest", "v1beta");
    await testModel("gemini-2.0-flash-exp", "v1beta");
}

runTests();
