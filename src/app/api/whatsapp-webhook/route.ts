import { NextRequest, NextResponse } from 'next/server';
import { MessageService } from '@/lib/services/message-service';

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

        // 🚀 THE ENGINE: Delegate to MessageService
        const result = await MessageService.processIncomingMessage(message);

        return NextResponse.json(result, { status: 200 });

    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
}
