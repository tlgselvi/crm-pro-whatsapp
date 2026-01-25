import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppTemplate } from '@/lib/whatsapp';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const { to, templateName, languageCode } = await request.json();

        if (!to || !templateName) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const result = await sendWhatsAppTemplate(to, templateName, languageCode);

        // Log the template message to the database
        const { data: contact } = await supabase.from('contacts').select('id').eq('phone', to.replace('+', '')).single();
        if (contact) {
            const { data: conv } = await supabase.from('conversations').select('id').eq('contact_id', contact.id).single();
            if (conv) {
                await supabase.from('messages').insert({
                    conversation_id: conv.id,
                    sender: 'agent',
                    content: `[Template Sent] ${templateName}`,
                    platform: 'whatsapp',
                    is_read: true
                });
            }
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('WhatsApp Template Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
