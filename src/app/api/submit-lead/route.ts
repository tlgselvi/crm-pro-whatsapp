import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// High-performance Edge Runtime
export const runtime = 'edge';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Form-ID',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');

    try {
        const body = await request.json();
        const { name, email, phone, message, formId } = body;

        // 🛡️ Basic Rate Limiting / Validation
        if (!name || !phone || name.length < 2) {
            return NextResponse.json(
                { error: 'Geçersiz veri girişi. İsim ve Telefon zorunludur.' },
                { status: 400, headers: corsHeaders }
            );
        }

        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            return NextResponse.json(
                { error: 'Geçersiz telefon numarası.' },
                { status: 400, headers: corsHeaders }
            );
        }

        // 1. Create or Find Contact
        const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .upsert({
                name: name.trim(),
                email: email?.trim() || null,
                phone: cleanPhone,
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
            content: `[Web Form] ${message?.trim() || 'Mesaj bırakılmadı.'}`,
            platform: 'web',
            is_read: false
        });

        return NextResponse.json(
            { success: true, message: 'Talep başarıyla alındı.' },
            { status: 200, headers: corsHeaders }
        );
    } catch (error: any) {
        return NextResponse.json(
            { error: 'İşlem başarısız.', details: error.message },
            { status: 500, headers: corsHeaders }
        );
    }
}

