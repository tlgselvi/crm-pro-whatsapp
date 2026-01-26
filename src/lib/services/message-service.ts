import { supabase } from '@/lib/supabase';
import { processWorkflowTrigger } from '@/lib/workflow-engine';
import { getWhatsAppMediaUrl, downloadWhatsAppMedia, sendWhatsAppMessage } from '@/lib/whatsapp';

export interface IncomingMessage {
    from: string;
    id: string;
    type: string;
    text?: { body: string };
    image?: { id: string; caption?: string };
    document?: { id: string; caption?: string };
    audio?: { id: string };
    video?: { id: string };
}

export class MessageService {

    /**
     * Main entry point for processing an incoming WhatsApp message
     */
    static async processIncomingMessage(message: IncomingMessage) {
        console.log(`[MessageService] Processing message from ${message.from}`);

        try {
            // 1. Resolve Contact & Conversation
            const contact = await this.resolveContact(message.from);
            const conversation = await this.resolveConversation(contact.id);

            // 2. Handle Media & Content
            const { body, mediaUrl, mediaType } = await this.parseMessageContent(message);

            // 3. Persist Message
            const { error: msgError } = await supabase.from('messages').insert({
                conversation_id: conversation.id,
                sender: 'customer',
                content: body,
                is_read: false,
                platform: 'whatsapp',
                media_url: mediaUrl,
                media_type: mediaType,
                metadata: { whatsapp_id: message.id }
            });

            if (msgError) throw new Error(`Message persistence failed: ${msgError.message}`);

            // 4. Trigger "The Brain" (Workflow Engine)
            // In future phases, this could be pushed to a Queue (Redis) instead of awaiting
            const workflowResult = await processWorkflowTrigger(body, contact.id, message.from);

            return {
                status: 'success',
                conversationId: conversation.id,
                workflowTriggered: !!workflowResult
            };

        } catch (error) {
            console.error('[MessageService] Error:', error);
            throw error;
        }
    }

    /**
     * Find or create a contact based on phone number
     */
    private static async resolveContact(phone: string) {
        const { data: existing } = await supabase
            .from('contacts')
            .select('*')
            .eq('phone', phone)
            .single();

        if (existing) return existing;

        const { data: newContact, error } = await supabase
            .from('contacts')
            .insert({
                name: `WhatsApp User ${phone.slice(-4)}`,
                phone: phone,
            })
            .select()
            .single();

        if (error) throw new Error(`Contact creation failed: ${error.message}`);
        return newContact;
    }

    /**
     * Find or create an active conversation for the contact
     */
    private static async resolveConversation(contactId: string) {
        // Logic: Try to find an open/active conversation. 
        // If last conversation is 'closed', create new.
        const { data: existing } = await supabase
            .from('conversations')
            .select('*')
            .eq('contact_id', contactId)
            .eq('status', 'active')
            .single();

        if (existing) return existing;

        const { data: newConv, error } = await supabase
            .from('conversations')
            .insert({
                contact_id: contactId,
                status: 'active',
            })
            .select()
            .single();

        if (error) throw new Error(`Conversation creation failed: ${error.message}`);
        return newConv;
    }

    /**
     * Parse message type, download media if necessary, and return standardized content
     */
    private static async parseMessageContent(message: IncomingMessage) {
        let body = '';
        let mediaUrl = null;
        let mediaType = message.type === 'text' ? null : message.type;

        if (message.type === 'text') {
            body = message.text?.body || '';
        }
        else if (['image', 'document', 'audio', 'video'].includes(message.type)) {
            // @ts-ignore
            const mediaData = message[message.type];
            body = mediaData.caption || (message.type === 'image' ? '📷 Resim' : '📎 Dosya');

            if (mediaData?.id) {
                try {
                    const whatsappUrl = await getWhatsAppMediaUrl(mediaData.id);
                    const { buffer, contentType } = await downloadWhatsAppMedia(whatsappUrl);

                    const fileName = `${mediaData.id}.${contentType.split('/')[1] || 'bin'}`;
                    const filePath = `${message.from}/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('whatsapp-media')
                        .upload(filePath, buffer, { contentType, upsert: true });

                    if (!uploadError) {
                        const { data } = supabase.storage.from('whatsapp-media').getPublicUrl(filePath);
                        mediaUrl = data.publicUrl;
                    }
                } catch (e) {
                    console.error('[MessageService] Media handling failed', e);
                    body += ' (Medya indirilemedi)';
                }
            }
        }

        return { body, mediaUrl, mediaType };
    }
}
