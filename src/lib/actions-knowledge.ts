'use server';

import { supabase } from './supabase';
import { revalidatePath } from 'next/cache';
import { generateEmbedding } from './ai-agent';
import { google } from './ai';
import { generateText } from 'ai';

export async function scrapeWebsiteAction(url: string) {
    try {
        const response = await fetch(url);
        const html = await response.text();

        // Use Gemini to clean and structure the HTML content (Rule 2.2: Context Injection)
        const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            system: 'Sen bir veri analisti ve içerik editörüsün. Sana verilen ham HTML içerisinden sadece şirket, ürün, hizmet, iletişim ve çalışma saatleri gibi iş odaklı bilgileri ayıkla. Bu bilgileri profesyonel ve yapılandırılmış bir metin haline getir. Gereksiz menü, footer veya reklam yazılarını at.',
            prompt: `Aşağıdaki HTML içeriğini bir chatbot eğitim metnine dönüştür:\n\n${html.substring(0, 15000)}` // Limit for token safety
        });

        return {
            success: true,
            content: text,
            title: `${new URL(url).hostname} - Web Sitesi Bilgisi`
        };
    } catch (error: any) {
        console.error('[KnowledgeAction] Scraping failed:', error);
        throw new Error('Web sitesi okunamadı. Lütfen URL\'yi kontrol edin veya sitenin erişilebilir olduğundan emin olun.');
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
        throw new Error('Yapay zeka metni geliştiremedi.');
    }
}

export async function addKnowledgeEntry(title: string, content: string, type: string = 'text') {
    // Generate embedding for RAG support (Rule 2.2: Context Injection)
    // text-embedding-004 dimensions = 768
    const embedding = await generateEmbedding(content);

    const { data, error } = await supabase
        .from('knowledge_base')
        .insert([{ title, content, type, embedding }])
        .select()
        .single();

    if (error) throw error;

    // Revalidate to ensure AI reflects new knowledge across the app
    revalidatePath('/', 'layout');
    return data;
}

export async function deleteKnowledgeEntry(id: string) {
    const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id);

    if (error) throw error;
    revalidatePath('/', 'layout');
}

export async function clearAllCaches() {
    // Clears Next.js Data Cache for the entire dashboard
    revalidatePath('/', 'layout');
    return { success: true, message: 'Tüm sistem önbellekleri (Caches) başarıyla temizlendi.' };
}

export async function getKnowledgeEntries() {
    const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}
