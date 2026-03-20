import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * n8n pipeline_stage → CRM stage mapping
 * Webhook'tan gelen pipeline aşamasını UI aşamasına çevirir.
 */
function mapPipelineStage(pipelineStage: string): string {
  const map: Record<string, string> = {
    new_lead: 'new',
    qualification: 'contacted',
    first_contact: 'contacted',
    site_visit: 'qualified',
    offer_sent: 'proposal',
    negotiation: 'negotiation',
    won: 'won',
    lost: 'lost',
  };
  return map[pipelineStage] ?? 'new';
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

/**
 * n8n → CRM Lead Webhook
 * n8n WhatsApp botundan gelen müşteri verilerini CRM'e kaydeder.
 *
 * Payload:
 * {
 *   name: string,
 *   phone: string,         // E.164 format: +905551234567
 *   segment: string,       // YENI_HAVUZ | BAKIM | MALZEME | TADILAT | SAUNA_SPA
 *   leadScore: number,     // 0-100
 *   leadTemp: string,      // HOT | WARM | COLD
 *   pipelineStage: string, // new_lead | qualification | first_contact | ...
 *   firstMessage: string,  // İlk müşteri mesajı özeti
 *   source: string,        // whatsapp_organic | meta_ads | website | referral
 *   waId: string,          // WhatsApp message ID
 *   notes?: string         // Ek notlar
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Güvenlik kontrolü
    const token = request.headers.get('x-webhook-token');
    if (WEBHOOK_SECRET && token !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      phone,
      segment,
      leadScore,
      leadTemp,
      pipelineStage,
      firstMessage,
      botAnswer,
      source,
      waId,
      notes,
    } = body;

    if (!phone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }

    // Telefon normalize et (+ ile başlamasını sağla)
    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    // Contact ara veya oluştur
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('phone', normalizedPhone)
      .single();

    let contactId: string;

    if (existingContact) {
      // Mevcut contact'ı güncelle
      contactId = existingContact.id;
      const mappedStage = pipelineStage ? mapPipelineStage(pipelineStage) : undefined;
      await supabase
        .from('contacts')
        .update({
          name: name || existingContact.name,
          segment: segment || undefined,
          lead_score: leadScore ?? undefined,
          lead_temperature: leadTemp || undefined,
          pipeline_stage: pipelineStage || undefined,
          stage: mappedStage,
          source: source || undefined,
          notes: notes || undefined,
          last_contact_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', contactId);
    } else {
      // Yeni contact oluştur
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          name: name || 'WhatsApp Müşterisi',
          phone: normalizedPhone,
          segment: segment || null,
          lead_score: leadScore || 0,
          lead_temperature: leadTemp || 'COLD',
          pipeline_stage: pipelineStage || 'new_lead',
          stage: mapPipelineStage(pipelineStage || 'new_lead'),
          source: source || 'whatsapp_organic',
          first_message: firstMessage || null,
          notes: notes || null,
          last_contact_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (contactError || !newContact) {
        console.error('Contact oluşturma hatası:', contactError);
        return NextResponse.json({ error: 'Contact creation failed', details: contactError }, { status: 500 });
      }

      contactId = newContact.id;
    }

    // Aktif conversation var mı kontrol et
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('contact_id', contactId)
      .eq('status', 'active')
      .single();

    let conversationId: string;

    if (existingConv) {
      conversationId = existingConv.id;
      // Son mesaj zamanını güncelle
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    } else {
      // Yeni conversation oluştur
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          contact_id: contactId,
          status: 'active',
          last_message_at: new Date().toISOString(),
          unread_count: 1,
        })
        .select('id')
        .single();

      if (convError || !newConv) {
        console.error('Conversation oluşturma hatası:', convError);
        return NextResponse.json({ error: 'Conversation creation failed', details: convError }, { status: 500 });
      }

      conversationId = newConv.id;
    }

    // Müşteri mesajını kaydet
    if (firstMessage) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender: 'customer',
        content: firstMessage,
        timestamp: new Date().toISOString(),
        is_read: false,
        platform: 'whatsapp',
      });
    }

    // Bot cevabını kaydet
    if (botAnswer) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender: 'agent',
        content: botAnswer,
        timestamp: new Date(Date.now() + 1000).toISOString(),
        is_read: true,
        platform: 'whatsapp',
      });
    }

    return NextResponse.json({
      success: true,
      contactId,
      conversationId,
      isNew: !existingContact,
      leadTemp: leadTemp || 'COLD',
    });

  } catch (error) {
    console.error('n8n webhook hatası:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Webhook test endpoint
export async function GET(request: NextRequest) {
  const token = request.headers.get('x-webhook-token');
  if (WEBHOOK_SECRET && token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ status: 'ok', message: 'DESE CRM n8n webhook aktif' });
}
