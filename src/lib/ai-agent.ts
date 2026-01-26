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
 * Searches the knowledge base for relevant content.
 * Category 'informational' is prioritized for RAG.
 */
export async function searchKnowledgeBase(query: string, limit = 5) {
    const embedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc('match_knowledge_base_v2', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: limit,
        category_filter: 'informational'
    });

    if (error) {
        console.error('[AIAgent] Error searching knowledge base:', error);
        return [];
    }

    return data || [];
}

/**
 * Fetches strict Behavioral and Guardrail rules.
 */
async function getActiveRules() {
    const { data, error } = await supabase
        .from('knowledge_base')
        .select('content, category, priority')
        .in('category', ['behavioral', 'guardrail'])
        .order('priority', { ascending: false });

    if (error) return { behavioral: [], guardrail: [] };

    return {
        behavioral: data.filter(r => r.category === 'behavioral').map(r => r.content),
        guardrail: data.filter(r => r.category === 'guardrail').map(r => r.content)
    };
}

/**
 * Generates an AI response using Hierarchical Context Injection and Multimodal support.
 */
export async function generateAIResponse(
    userMessage: string,
    contactId: string,
    attachments?: { url: string, type: string }[]
) {
    // 1. Fetch AI Settings & Global Rules
    const [settingsRes, rules] = await Promise.all([
        supabase.from('ai_settings').select('*').single(),
        getActiveRules()
    ]);

    const settings = settingsRes.data;
    const companyContext = settings ? `Şirket: ${settings.company_name}. ` : '';
    const basePrompt = settings?.system_instructions || 'Sen profesyonel bir asistansın.';

    // 2. Retrieve relevant informational docs (RAG)
    const relevantDocs = await searchKnowledgeBase(userMessage);
    const knowledgeContext = relevantDocs.map((doc: any) => doc.content).join('\n---\n');

    // 3. Construct Hierarchical System Prompt
    const guardrailSystem = rules.guardrail.length > 0
        ? `\n\n### KESİN YASAKLAR VE SINIRLAR (GUARDRAILS):\n- ${rules.guardrail.join('\n- ')}`
        : '';

    const behavioralSystem = rules.behavioral.length > 0
        ? `\n\n### DAVRANIŞ VE ETKİLEŞİM KURALLARI:\n- ${rules.behavioral.join('\n- ')}`
        : '';

    const fullSystemPrompt = `
${basePrompt}
${companyContext}

${behavioralSystem}
${guardrailSystem}

### ÖNEMLİ TALİMAT:
Yukarıdaki "DAVRANIŞ" ve "YASAKLAR" kuralları, aşağıdaki "BİLGİ BANKASI" verilerinden daha önceliklidir. 
Eğer bir kural, bilgi bankasındaki bir veriyle çelişirse, her zaman KURALI uygula.

### BİLGİ BANKASI BAĞLAMI:
${knowledgeContext || 'Şu an bu konuda özel bir bilgi yok, genel şirket bilgilerinle yanıt ver.'}

### MULTIMODAL TALIMATLAR:
- Eğer bir görsel eklenmişse, görseldeki yazıları, ürünleri veya dekont verilerini analiz et.
- Eğer ses kaydı eklenmişse (transkript sağlanmış olabilir), sesin duygusunu ve talebini anla.
`.trim();

    // 4. Construct Multimodal Prompt
    const contentParts: any[] = [{ type: 'text', text: userMessage }];

    if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
            if (attachment.type.startsWith('image/')) {
                contentParts.push({ type: 'image', image: new URL(attachment.url) });
            } else if (attachment.type.startsWith('audio/')) {
                // Audio support depends on the model's audio capabilities
                contentParts.push({ type: 'file', data: new URL(attachment.url), mimeType: attachment.type });
            }
        }
    }

    // 5. Generate Answer
    const { text } = await generateText({
        model: google('gemini-2.5-flash'),
        system: fullSystemPrompt,
        messages: [
            { role: 'user', content: contentParts }
        ],
    });

    return text;
}
