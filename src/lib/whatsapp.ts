const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

interface SendMessageParams {
    to: string; // Phone number
    message: string;
}

// Support both calling styles
export async function sendWhatsAppMessage(toOrParams: string | SendMessageParams, message?: string) {
    const to = typeof toOrParams === 'string' ? toOrParams : toOrParams.to;
    const msg = typeof toOrParams === 'string' ? message! : toOrParams.message;

    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
        throw new Error('WhatsApp credentials not configured');
    }

    const url = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: to,
                type: 'text',
                text: {
                    body: msg,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`WhatsApp API error: ${error}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        throw error;
    }
}

export async function markWhatsAppMessageAsRead(messageId: string) {
    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
        return;
    }

    const url = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    try {
        await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId,
            }),
        });
    } catch (error) {
        console.error('Error marking message as read:', error);
    }
}
