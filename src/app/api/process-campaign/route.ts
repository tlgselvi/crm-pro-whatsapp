import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
    try {
        const { campaignId, templateName, contacts } = await request.json();

        if (!campaignId || !templateName || !contacts || !Array.isArray(contacts)) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Update campaign status to sending
        await supabase.from('campaigns').update({ status: 'sending', last_run_at: new Date().toISOString() }).eq('id', campaignId);

        let sent = 0;
        let failed = 0;

        // Process messages (Note: In production, use a queue/worker)
        for (const contact of contacts) {
            try {
                // Here we would use a template-specific send function if available
                // For now, using the general send function
                await sendWhatsAppMessage(contact.phone, `[Şablon: ${templateName}] Merhaba ${contact.name}!`);
                sent++;
            } catch (err) {
                console.error(`Failed to send to ${contact.phone}:`, err);
                failed++;
            }
        }

        // Update campaign final status
        await supabase.from('campaigns').update({
            status: 'completed',
            sent_count: sent,
            failed_count: failed
        }).eq('id', campaignId);

        return NextResponse.json({ success: true, sent, failed });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
