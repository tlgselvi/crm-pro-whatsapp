import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = await streamText({
        model: google('gemini-2.5-flash'),
        messages,
        system: 'Sen Project Bow CRM asistanısın. Satış odaklı, kısa ve net cevaplar ver. Şirket adı: Bow, senin adın: Bow Asistan.',
    });

    return result.toDataStreamResponse();
}
