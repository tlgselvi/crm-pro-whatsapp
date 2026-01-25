import { supabase } from './supabase';

export interface BotRule {
    id?: string;
    keywords: string[];
    response: string;
    auto_reply: boolean;
}

export async function checkSalesbotRules(message: string): Promise<string | null> {
    const lowerMessage = message.toLowerCase().trim();

    try {
        const { data: rules } = await supabase
            .from('bot_rules')
            .select('*')
            .eq('auto_reply', true);

        if (!rules) return null;

        for (const rule of rules) {
            const match = rule.keywords.some((keyword: string) =>
                lowerMessage.includes(keyword.toLowerCase())
            );
            if (match) return rule.response;
        }
    } catch (error) {
        console.error('Salesbot Matching Error:', error);
    }
    return null;
}

export async function getAllRules(): Promise<BotRule[]> {
    const { data } = await supabase.from('bot_rules').select('*').order('created_at', { ascending: false });
    return data || [];
}

