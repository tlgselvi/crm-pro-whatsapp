import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export async function POST(request: NextRequest) {
    try {
        const { lastMessage, customerName } = await request.json();

        if (!GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'Gemini API key not configured' },
                { status: 500 }
            );
        }

        const prompt = `Sen profesyonel bir satış asistanısın. 

Müşteri: ${customerName || 'Müşteri'}
Son mesajı: "${lastMessage}"

Kuralllar:
- Kibar ve profesyonel ol
- Satış odaklı ama pushy olma
- Kısa ve net yaz (max 2-3 cümle)
- Türkçe yanıt ver
- Emojiler kullanabilirsin ama abartma

Müşteriye uygun bir yanıt yaz:`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt,
                                },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 200,
                    },
                }),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error('Gemini API error:', error);
            return NextResponse.json(
                { error: 'Failed to generate AI suggestion' },
                { status: 500 }
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
