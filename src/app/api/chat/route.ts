import { google } from '@/lib/ai';
import { streamText } from 'ai';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages, attachments } = await req.json();
    const cookieStore = await cookies();

    // ... Supabase client initialization same as before ...
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch { }
                },
            },
        }
    );

    // 1. Fetch AI Persona Settings
    const { data: settings } = await supabase
        .from('ai_settings')
        .select('*')
        .single();

    // 2. Fetch Knowledge Base Context (Simple RAG for Chat)
    // In a real scenario, we'd use generateAIResponse here, 
    // but for the streaming Chat UI, we'll keep it native.

    // 3. Construct Context String
    const systemPrompt = `
    Sen ${settings?.company_name || 'Bow CRM'} şirketinin yapay zeka asistanısın.
    TON: ${settings?.tone || 'professional'}
    TALİMATLAR: ${settings?.system_instructions || 'Kullanıcıya yardımcı ol.'}
    
    ### MULTIMODAL YETENEKLER:
    - Sana gönderilen görselleri ve dosyaları analiz edebilirsin.
    - Dekontları, ürün resimlerini veya dokümanları inceleyip bilgi verebilirsin.
    `.trim();

    // 4. Map messages to include multimodal content
    const processedMessages = messages.map((m: any, index: number) => {
        if (index === messages.length - 1 && attachments && attachments.length > 0) {
            const content: any[] = [{ type: 'text', text: m.content }];
            attachments.forEach((a: any) => {
                if (a.type.startsWith('image/')) {
                    content.push({ type: 'image', image: new URL(a.url) });
                } else {
                    content.push({ type: 'file', data: new URL(a.url), mimeType: a.type });
                }
            });
            return { ...m, content };
        }
        return m;
    });

    const result = await streamText({
        model: google('gemini-2.5-flash'),
        messages: processedMessages,
        system: systemPrompt,
    });

    return result.toTextStreamResponse();
}
