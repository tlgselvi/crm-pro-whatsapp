import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export async function POST(request: NextRequest) {
    try {
        const { description, researchData } = await request.json();

        if (!description) {
            return NextResponse.json({ error: 'Description is required' }, { status: 400 });
        }

        if (!GEMINI_API_KEY) {
            console.error('AI Suggest Error: Gemini API key is missing');
            return NextResponse.json({ error: 'Gemini API token not configured' }, { status: 500 });
        }

        // 🧠 Prompt for Gemini based on research or description
        const prompt = `
        Sen bir CRM uzmanısın. Aşağıdaki sektör/işletme açıklaması ve araştırmasına dayanarak bir AI Satış Botu personası oluştur.
        
        İŞLETME AÇIKLAMASI: ${description}
        SEKTÖR ARAŞTIRMASI: ${researchData || 'Genel satış prensiplerini kullan.'}
        
        Lütfen tam olarak şu JSON formatında yanıt ver:
        {
          "system_prompt": "Botun kişiliği, satış stratejisi ve davranış kuralları (Türkçe)",
          "tone": "Botun konuşma tarzı (Örn: Samimi ve yardımsever)",
          "suggested_faqs": [
            {"question": "Soru 1", "answer": "Cevap 1"},
            {"question": "Soru 2", "answer": "Cevap 2"},
            {"question": "Soru 3", "answer": "Cevap 3"},
            {"question": "Soru 4", "answer": "Cevap 4"},
            {"question": "Soru 5", "answer": "Cevap 5"}
          ]
        }
        
        Sadece JSON objesini döndür, başka metin ekleme.`;

        let response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 1,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: 2048,
                        response_mime_type: "application/json"
                    }
                }),
            }
        );


        if (!response.ok) {
            const errTxt = await response.text();
            throw new Error(`Gemini API: ${response.status} - ${errTxt}`);
        }

        const gData = await response.json();
        let rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        // Robust parsing
        let persona;
        try {
            persona = JSON.parse(rawText);
        } catch (pErr) {
            console.error('JSON Parse Error, raw text:', rawText);
            // Fallback: try to extract JSON from markdown if Gemini ignored the mime_type
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                persona = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('AI produced invalid JSON output');
            }
        }

        if (!persona.system_prompt || !persona.suggested_faqs) {
            throw new Error('Persona structure is incomplete');
        }

        // 💾 ATOMIC-LIKE DATABASE OPERATIONS
        // 1. Update AI Settings
        const { data: currentSet } = await supabase.from('ai_settings').select('id').limit(1).single();

        const { error: settingsError } = await supabase
            .from('ai_settings')
            .upsert({
                id: currentSet?.id,
                company_name: description.split(' ')[1] || description.split(' ')[0] || 'CRM Pro',
                tone: persona.tone || 'Professional',
                system_instructions: persona.system_prompt
            });

        if (settingsError) throw new Error(`Database Error (Settings): ${settingsError.message}`);

        // 2. Clear Knowledge Base (Safely)
        const { error: delError } = await supabase.from('knowledge_base').delete().neq('topic', '___SYSTEM_RESERVED___');
        if (delError) console.error('KB clear warning:', delError);

        // 3. Insert new KB items
        if (persona.suggested_faqs && Array.isArray(persona.suggested_faqs)) {
            const faqEntries = persona.suggested_faqs.map((faq: any) => ({
                topic: faq.question?.substring(0, 255) || 'Question',
                content: faq.answer || ''
            })).filter((f: any) => f.content.length > 0);

            if (faqEntries.length > 0) {
                const { error: kbError } = await supabase.from('knowledge_base').insert(faqEntries);
                if (kbError) throw new Error(`Database Error (KB): ${kbError.message}`);
            }
        }

        return NextResponse.json({ success: true, persona });
    } catch (error: any) {
        console.error('CRITICAL API ERROR:', error);
        return NextResponse.json({
            error: error.message || 'Unknown internal error',
            status: 'error'
        }, { status: 500 });
    }
}

