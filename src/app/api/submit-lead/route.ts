import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Form-ID',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, phone, message, formId } = body;

        if (!name || !phone) {
            return NextResponse.json(
                { error: 'Name and Phone are required' },
                { status: 400, headers: corsHeaders }
            );
        }

        // 1. Create or Find Contact
        const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .upsert({
                name,
                email: email || null,
                phone: phone.replace(/\D/g, ''), // Clean phone
                stage: 'Incoming',
            }, { onConflict: 'phone' })
            .select()
            .single();

        if (contactError) throw contactError;

        // 2. Create Conversation
        const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .upsert({
                contact_id: contact.id,
                status: 'active',
            }, { onConflict: 'contact_id' })
            .select()
            .single();

        if (convError) throw convError;

        // 3. Save Message/Submission Note
        await supabase.from('messages').insert({
            conversation_id: conversation.id,
            sender: 'customer',
            content: `[Form Submission] ${message || 'No message provided.'}`,
            platform: 'web',
            is_read: false
        });

        return NextResponse.json(
            { success: true, message: 'Lead submitted successfully' },
            { status: 200, headers: corsHeaders }
        );
    } catch (error: any) {
        console.error('Submit Lead Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500, headers: corsHeaders }
        );
    }
}
