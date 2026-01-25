import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export async function POST(request: NextRequest) {
    try {
        const { lastMessage, customerName } = await request.json();

        if (!GEMINI_API_KEY) {
            console.error('AI Suggest Error: Gemini API key is missing');
            return NextResponse.json(
                { error: 'Gemini API key not configured' },
                { status: 500 }
            );
        }

        // 🧠 FETCH KNOWLEDGE BASE AND SETTINGS
        const { data: settings } = await supabase.from('ai_settings').select('*').single();
        const { data: kbItems } = await supabase.from('knowledge_base').select('topic, content');

        const companyName = settings?.company_name || 'CRM Pro';
        const tone = settings?.tone || 'professional';
        const instructions = settings?.system_instructions || '';

        let kbContext = '';
        if (kbItems && kbItems.length > 0) {
            kbContext = '\nBİLGİ BANKASI:\n' + kbItems.map((item: any) => `- ${item.topic}: ${item.content}`).join('\n');
        }

        const prompt = `Sen ${companyName} firmasının kıdemli satış asistanısın. 
Müşteriye teknik olarak bilgili, samimi ve çözüm odaklı cevaplar vermelisin.

Müşteri: ${customerName || 'Müşteri'}
Mesaj: "${lastMessage}"

BAĞLAM:
${kbContext || 'Şirket genel vizyonuyla cevap ver.'}

KURALLAR:
- Ton: ${tone}
- Talimatlar: ${instructions}
- Uzunluk: Maksimum 2 cümle.
- Dil: Türkçe.

Satış odaklı cevabını yaz:`;

        let response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.65,
                        maxOutputTokens: 256,
                    },
                }),
            }
        );


        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API Error Response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            return NextResponse.json(
                { error: 'Failed to generate AI suggestion', details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        const suggestion = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return NextResponse.json({ suggestion });
    } catch (error) {
        console.error('AI suggestion error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
