'use server';

import { revalidatePath } from 'next/cache';
import { generateEmbedding } from './ai-agent';
import { google } from './ai';
import { generateText } from 'ai';
import { createClient } from './supabase-server';

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

export async function refineTrainingPrompt(rawPrompt: string) {
    try {
        const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            system: 'Sen bir CRM Eğitim Uzmanısın. Sana verilen kısa ve yapılandırılmamış notları, bir chatbotun en verimli şekilde kullanabileceği, detaylı, profesyonel ve kurumsal bir "Bilgi Bankası" maddesine dönüştür. Müşteri odaklı bir dil kullan.',
            prompt: `Bu notu geliştir ve detaylı bir eğitim metni haline getir:\n\n${rawPrompt}`
        });

        return { success: true, refinedContent: text };
    } catch (error: any) {
        console.error('[KnowledgeAction] Refinement failed:', error);
        return { success: false, error: 'Yapay zeka metni geliştiremedi.' };
    }
}

export async function addKnowledgeEntry(title: string, content: string, type: string = 'text') {
    try {
        const supabase = await createClient();

        // Generate embedding for RAG support
        const rawEmbedding = await generateEmbedding(content);
        // Explicitly convert to standard array to prevent PostgREST 400 errors (Rule 3: Deterministic)
        const embedding = Array.from(rawEmbedding);

        const { data, error } = await supabase
            .from('knowledge_base')
            .insert([{
                title,
                content,
                type,
                embedding,
                metadata: { source: 'manual_training' }
            }])
            .select('id, title, content, type, created_at')
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

export async function getKnowledgeEntries() {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('knowledge_base')
            .select('id, title, content, type, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[KnowledgeAction] Fetch error:', error);
        return [];
    }
}
