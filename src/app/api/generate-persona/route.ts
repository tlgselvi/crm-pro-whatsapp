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

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { response_mime_type: "application/json" }
                }),
            }
        );

        if (!response.ok) throw new Error('Gemini API request failed');

        const gData = await response.json();
        const persona = JSON.parse(gData.candidates?.[0]?.content?.parts?.[0]?.text || '{}');

        // 💾 SAVE TO DATABASE
        // 1. Update AI Settings
        const { error: settingsError } = await supabase
            .from('ai_settings')
            .upsert({
                id: (await supabase.from('ai_settings').select('id').single()).data?.id || undefined,
                company_name: description.split(' ')[0], // Best guess for name
                tone: persona.tone,
                system_instructions: persona.system_prompt
            });

        if (settingsError) console.error('Settings save error:', settingsError);

        // 2. Clear and Insert Knowledge Base (Optional: replace or append)
        // User said "otomatik kaydet", usually means fresh start for persona
        await supabase.from('knowledge_base').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Clean start

        const faqEntries = persona.suggested_faqs.map((faq: any) => ({
            topic: faq.question,
            content: faq.answer
        }));

        const { error: kbError } = await supabase.from('knowledge_base').insert(faqEntries);
        if (kbError) console.error('KB save error:', kbError);

        return NextResponse.json({ success: true, persona });
    } catch (error: any) {
        console.error('Persona generation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
