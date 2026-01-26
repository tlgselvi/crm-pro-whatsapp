import { google } from '../ai';
import { generateText } from 'ai';
import { supabase } from '../supabase';

/**
 * Generates a concise AI summary of the recent conversation history
 * to help human agents take over efficiently.
 */
export async function summarizeConversation(conversationId: string): Promise<string> {
    try {
        // 1. Fetch last 15 messages for context
        const { data: messages, error } = await supabase
            .from('messages')
            .select('sender, content, timestamp')
            .eq('conversation_id', conversationId)
            .order('timestamp', { ascending: false })
            .limit(15);

        if (error || !messages || messages.length === 0) {
            return 'Özetlenecek yeterli veri yok.';
        }

        // Reverse to get chronological order for AI
        const historyText = messages.reverse()
            .map(m => `${m.sender === 'agent' ? 'Asistan/AI' : 'Müşteri'}: ${m.content}`)
            .join('\n');

        // 2. AI Summarization Logic
        const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            system: `
                Sen bir CRM operasyon yöneticisisin. 
                Görevin, aşağıdaki konuşma geçmişini bir insan temsilciye aktarmak için özetlemek.
                - Özet en fazla 3 cümle olmalı.
                - Müşterinin asıl talebini ve şu anki durumu açıkla.
                - Varsa acil bir konu belirt.
                - Sadece profesyonel Türkçe kullan.
            `.trim(),
            prompt: `Konuşma Geçmişi:\n${historyText}\n\nLütfen bu konuşmayı özetle:`,
        });

        return text;
    } catch (err) {
        console.error('[HandoverService] Error summarizing conversation:', err);
        return 'Özet oluşturulurken bir hata oluştu.';
    }
}
