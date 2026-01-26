import { google } from '@/lib/ai';
import { streamText } from 'ai';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();
    const cookieStore = await cookies();

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
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );

    // 1. Fetch AI Persona Settings
    const { data: settings } = await supabase
        .from('ai_settings')
        .select('*')
        .single();

    // 2. Fetch Knowledge Base (Simple RAG - Top 5 recent for now)
    // TODO: Implement Vector Search for better scaling
    const { data: kb } = await supabase
        .from('knowledge_base')
        .select('topic, content')
        .limit(5);

    // 3. Construct Context String
    const kbContext = kb?.map((item: { topic: string; content: string }) => `- ${item.topic}: ${item.content}`).join('\n') || 'Bilgi bulunamadı.';

    const systemPrompt = `
    Sen ${settings?.company_name || 'Bow CRM'} şirketinin yapay zeka asistanısın.
    
    TON: ${settings?.tone || 'professional'}
    
    TALİMATLAR:
    ${settings?.system_instructions || 'Kullanıcıya yardımcı ol, kısa ve net cevaplar ver.'}
    
    BİLGİ BANKASI (Şirket Hakkında Bildiklerin):
    ${kbContext}
    
    Eğer bilgi bankasında sorunun cevabı yoksa, nazikçe bilmediğini söyle ve yetkiliye yönlendir. Asla uydurma bilgi verme.
    `;

    const result = await streamText({
        model: google('gemini-2.5-flash'),
        messages,
        system: systemPrompt,
    });

    return result.toTextStreamResponse();
}
