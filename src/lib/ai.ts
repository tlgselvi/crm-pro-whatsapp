import { createGoogleGenerativeAI } from '@ai-sdk/google';

// Create a custom Google AI provider that checks for GOOGLE_API_KEY as well
export const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
});
