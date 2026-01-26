'use server';

import { supabase } from './supabase';
import { revalidatePath } from 'next/cache';
import { generateEmbedding } from './ai-agent';

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
