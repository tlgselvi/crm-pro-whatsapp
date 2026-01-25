import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkSalesbotRules } from '@/lib/salesbot';
import { sendWhatsAppMessage, getWhatsAppMediaUrl, downloadWhatsAppMedia } from '@/lib/whatsapp';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'your_verify_token_here';

// Webhook verification (required by Meta)
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified successfully');
        return new NextResponse(challenge, { status: 200 });
    }

    return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// Incoming WhatsApp messages
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Extract message data from WhatsApp webhook payload
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const messages = value?.messages;

        if (!messages || messages.length === 0) {
            return NextResponse.json({ status: 'no_messages' }, { status: 200 });
        }

        const message = messages[0];
        const from = message.from; // Phone number
        const messageId = message.id;
        const type = message.type;

        let messageBody = message.text?.body || '';
        let mediaUrl = null;
        let mediaType = type;

        // Handle Media (image/document/video/audio)
        if (type === 'image' || type === 'document') {
            const mediaData = message[type];
            const mediaId = mediaData.id;
            messageBody = mediaData.caption || (type === 'image' ? 'Resim gönderildi' : 'Dosya gönderildi');

            try {
                const metaUrl = await getWhatsAppMediaUrl(mediaId);
                const { buffer, contentType } = await downloadWhatsAppMedia(metaUrl);

                const fileName = `${mediaId}.${contentType.split('/')[1] || 'bin'}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('whatsapp-media')
                    .upload(`${from}/${fileName}`, buffer, {
                        contentType: contentType,
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('whatsapp-media')
                    .getPublicUrl(uploadData.path);

                mediaUrl = publicUrl;
            } catch (mediaErr) {
                console.error('Media processing error:', mediaErr);
            }
        }

        // Find or create contact
        let contact;
        const { data: existingContact } = await supabase
            .from('contacts')
            .select('*')
            .eq('phone', from)
            .single();

        if (existingContact) {
            contact = existingContact;
        } else {
            const { data: newContact, error: contactError } = await supabase
                .from('contacts')
                .insert({
                    name: `WhatsApp User ${from.slice(-4)}`,
                    phone: from,
                })
                .select()
                .single();

            if (contactError) throw contactError;
            contact = newContact;
        }

        // Find or create conversation
        let conversation;
        const { data: existingConv } = await supabase
            .from('conversations')
            .select('*')
            .eq('contact_id', contact.id)
            .single();

        if (existingConv) {
            conversation = existingConv;
        } else {
            const { data: newConv, error: convError } = await supabase
                .from('conversations')
                .insert({
                    contact_id: contact.id,
                    status: 'active',
                })
                .select()
                .single();

            if (convError) throw convError;
            conversation = newConv;
        }

        // Save incoming message
        const { error: messageError } = await supabase.from('messages').insert({
            conversation_id: conversation.id,
            sender: 'customer',
            content: messageBody,
            is_read: false,
            platform: 'whatsapp',
            media_url: mediaUrl,
            media_type: mediaType === 'text' ? null : mediaType,
        });

        if (messageError) throw messageError;

        // 🤖 SALESBOT: Check for auto-reply rules
        const autoReply = await checkSalesbotRules(messageBody);

        if (autoReply) {
            // Save bot response to database
            await supabase.from('messages').insert({
                conversation_id: conversation.id,
                sender: 'agent',
                content: autoReply,
                is_read: true,
                platform: 'whatsapp',
            });

            // Send response via WhatsApp (if credentials configured)
            try {
                await sendWhatsAppMessage(from, autoReply);
            } catch (whatsappError) {
                console.error('WhatsApp send failed (credentials missing?):', whatsappError);
                // Continue even if WhatsApp send fails - message saved to DB
            }
        }

        return NextResponse.json({ status: 'success', botTriggered: !!autoReply }, { status: 200 });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
}
