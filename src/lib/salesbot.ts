// Salesbot Rule Engine
interface BotRule {
    keywords: string[];
    response: string;
    autoReply: boolean;
}

// TODO: Move these rules to Supabase 'bot_rules' table for production extensibility
const SALESBOT_RULES: BotRule[] = [
    {
        keywords: ['merhaba', 'selam', 'hey', 'hi', 'hello'],
        response: 'Merhaba! 👋 Size nasıl yardımcı olabilirim? Ürünlerimiz hakkında bilgi almak ister misiniz?',
        autoReply: true,
    },
    {
        keywords: ['fiyat', 'ücret', 'ne kadar', 'price', 'cost'],
        response: `Merhaba! 💰 Fiyat listemiz için aşağıdaki bilgileri inceleyebilirsiniz:

📦 Temel Paket: ₺999/ay
⭐ Profesyonel Paket: ₺2,499/ay  
🚀 Kurumsal Paket: Özel fiyat

Hemen başlamak ister misiniz?`,
        autoReply: true,
    },
    {
        keywords: ['katalog', 'ürünler', 'neler var', 'catalog', 'products'],
        response: `📋 Ürün Kataloğumuz:

✅ WhatsApp CRM - Müşteri yönetimi
✅ Kanban Pipeline - Satış hunisi
✅ AI Asistan - Akıllı yanıtlar
✅ Salesbot - Otomatik mesajlar
✅ Analytics - Raporlama

Hangi ürün hakkında detay istersiniz?`,
        autoReply: true,
    },
    {
        keywords: ['demo', 'deneme', 'test', 'trial'],
        response: 'Harika! 🎉 7 günlük ücretsiz deneme başlatmak için lütfen e-posta adresinizi paylaşın.',
        autoReply: true,
    },
    {
        keywords: ['destek', 'yardım', 'help', 'support'],
        response: `💬 Destek Kanallarımız:

📧 Email: ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@yourdomain.com'}
🌐 Web: ${process.env.NEXT_PUBLIC_SUPPORT_URL || 'yourdomain.com/support'}

Ortalama yanıt süresi: 2 saat
Size nasıl yardımcı olabilirim?`,
        autoReply: true,
    },
];

export function checkSalesbotRules(message: string): string | null {
    const lowerMessage = message.toLowerCase().trim();

    for (const rule of SALESBOT_RULES) {
        if (rule.autoReply && rule.keywords.some((keyword) => lowerMessage.includes(keyword))) {
            return rule.response;
        }
    }

    return null; // No matching rule
}

export function getAllRules(): BotRule[] {
    return SALESBOT_RULES;
}
