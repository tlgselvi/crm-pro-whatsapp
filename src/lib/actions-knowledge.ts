'use server';

import { revalidatePath } from 'next/cache';
import { generateEmbedding } from './ai-agent';
import { google } from './ai';
import { generateText } from 'ai';
import { createClient } from './supabase-server';

export type KnowledgeCategory = 'informational' | 'behavioral' | 'guardrail';

export async function scrapeWebsiteAction(url: string) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Siteye erişilemedi.');

        const html = await response.text();

        // Use Gemini to clean and structure the HTML content
        const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            system: 'Sen bir veri analisti ve içerik editörüsün. Sana verilen ham HTML içerisinden sadece şirket, ürün, hizmet, iletişim ve çalışma saatleri gibi iş odaklı bilgileri ayıkla. Bu bilgileri profesyonel ve yapılandırılmış bir metin haline getir. Gereksiz menü, footer veya reklam yazılarını at.',
            prompt: `Aşağıdaki HTML içeriğini bir chatbot eğitim metnine dönüştür:\n\n${html.substring(0, 15000)}`
        });

        return {
            success: true,
            content: text,
            title: `${new URL(url).hostname} - Web Sitesi Bilgisi`
        };
    } catch (error: any) {
        console.error('[KnowledgeAction] Scraping failed:', error);
        return { success: false, error: error.message || 'Web sitesi okunamadı.' };
    }
}

export async function refineTrainingPrompt(rawPrompt: string, category: KnowledgeCategory = 'informational') {
    try {
        const systemInstruction = category === 'behavioral'
            ? 'Sen bir Chatbot Davranış Uzmanısın. Sana verilen notu, botun konuşma tarzını, etkileşim kurallarını ve satış stratejilerini belirleyen KESİN bir maddeye dönüştür.'
            : category === 'guardrail'
                ? 'Sen bir Güvenlik ve Uyum Uzmanısın. Sana verilen notu, botun ASLA yapmaması gerekenleri veya konuşmaması gereken konuları belirleyen katı bir yasaklama kuralına dönüştür.'
                : 'Sen bir CRM Eğitim Uzmanısın. Sana verilen kısa ve yapılandırılmamış notları, profesyonel bir Bilgi Bankası maddesine dönüştür.';

        const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            system: systemInstruction,
            prompt: `Bu notu geliştir ve detaylı bir eğitim metni haline getir:\n\n${rawPrompt}`
        });

        return { success: true, refinedContent: text };
    } catch (error: any) {
        console.error('[KnowledgeAction] Refinement failed:', error);
        return { success: false, error: 'Yapay zeka metni geliştiremedi.' };
    }
}

export async function addKnowledgeEntry(
    title: string,
    content: string,
    type: string = 'text',
    category: KnowledgeCategory = 'informational',
    priority: number = 0
) {
    try {
        const supabase = await createClient();

        // Generate embedding for RAG support
        const rawEmbedding = await generateEmbedding(content);
        const embedding = Array.from(rawEmbedding);

        const { data, error } = await supabase
            .from('knowledge_base')
            .insert([{
                title,
                content,
                type,
                category,
                priority: category !== 'informational' ? (priority || 10) : priority,
                embedding,
                metadata: { source: 'manual_training' }
            }])
            .select('id, title, content, type, category, created_at')
            .single();

        if (error) {
            console.error('[KnowledgeAction] DB Error:', error);
            return { success: false, error: `Veritabanı hatası: ${error.message}` };
        }

        revalidatePath('/', 'layout');
        return { success: true, data };
    } catch (error: any) {
        console.error('[KnowledgeAction] Save error:', error);
        return { success: false, error: error.message || 'Bilinmeyen bir hata oluştu.' };
    }
}

export async function getKnowledgeEntries(category?: KnowledgeCategory) {
    try {
        const supabase = await createClient();
        let query = supabase
            .from('knowledge_base')
            .select('id, title, content, type, category, priority, created_at');

        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[KnowledgeAction] Fetch error:', error);
        return [];
    }
}

export async function deleteKnowledgeEntry(id: string) {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from('knowledge_base')
            .delete()
            .eq('id', id);

        if (error) throw error;
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function clearAllCaches() {
    revalidatePath('/', 'layout');
    return { success: true, message: 'Tüm sistem önbellekleri (Caches) başarıyla temizlendi.' };
}

export async function suggestRulesAction() {
    try {
        const supabase = await createClient();
        const { data: settings } = await supabase.from('ai_settings').select('company_name, system_instructions').single();
        const { data: currentKnowledge } = await supabase.from('knowledge_base').select('title, category').limit(20);

        const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            system: 'Sen bir Elite CRM Mimarıyın. Bir işletmenin mevcut bilgilerini analiz edip, eksik olan DAVRANIŞ (Behavioral) ve YASAKLAR (Guardrails) kurallarını önerirsin. Yanıtın SADECE JSON dizisi olmalıdır. Format: [{title: string, content: string, category: "behavioral" | "guardrail", reason: string}]',
            prompt: `İşletme Adı: ${settings?.company_name}\nMevcut Bilgiler: ${currentKnowledge?.map(k => k.title).join(', ')}\n\nBu işletme için 5 adet kritik davranış veya yasaklama kuralı öner.`
        });

        // Simple cleanup in case block markdown used
        const cleanedText = text.replace(/```json|```/g, '').trim();
        return { success: true, suggestions: JSON.parse(cleanedText) };
    } catch (error: any) {
        return { success: false, error: 'Öneri üretilemedi.' };
    }
}
