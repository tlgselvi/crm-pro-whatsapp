import { google } from './ai';
import { generateText, embed } from 'ai';
import { supabase } from './supabase';

/**
 * Generates an embedding for a piece of text using Google's embedding model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const { embedding } = await embed({
        model: google.embedding('text-embedding-004'),
        value: text,
    });
    return embedding;
}

/**
 * Searches the knowledge base for relevant content based on a query.
 */
export async function searchKnowledgeBase(query: string, limit = 5) {
    const embedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc('match_knowledge_base', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: limit,
    });

    if (error) {
        console.error('[AIAgent] Error searching knowledge base:', error);
        return [];
    }

    return data || [];
}

/**
 * Generates an AI response using RAG.
 */
export async function generateAIResponse(userMessage: string, contactId: string) {
    // 1. Fetch AI Settings
    const { data: settings } = await supabase
        .from('ai_settings')
        .select('*')
        .single();

    const companyContext = settings ? `Şirket: ${settings.company_name}. ` : '';
    const systemPrompt = settings?.system_instructions || 'Sen bir yardımcısın.';

    // 2. Retrieve relevant docs
    const relevantDocs = await searchKnowledgeBase(userMessage);
    const context = relevantDocs.map((doc: any) => doc.content).join('\n---\n');

    // 3. Generate Answer
    const { text } = await generateText({
        model: google('gemini-1.5-flash'),
        system: `${systemPrompt}\n\n${companyContext}\n\nBilgi Bankası Bağlamı:\n${context}`,
        prompt: userMessage,
    });

    return text;
}
