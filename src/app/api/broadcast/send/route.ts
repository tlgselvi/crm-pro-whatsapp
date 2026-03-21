import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xntwzphvzuvonvlfaaeu.supabase.co';
const PHONE_NUMBER_ID = '981728991694454';
const WHATSAPP_API = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

function getSecrets() {
  try {
    const secretsBase = process.env.SECRETS_PATH || 'C:/Users/tlgse/.openclaw/workspace/secrets';
    const serviceKey = readFileSync(join(secretsBase, 'supabase-service-role-key.txt'), 'utf-8').trim();
    const metaToken = readFileSync(join(secretsBase, 'meta-page-token.txt'), 'utf-8').trim();
    return { serviceKey, metaToken };
  } catch {
    return {
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      metaToken: process.env.META_PAGE_TOKEN || '',
    };
  }
}

function formatPhone(phone: string): string {
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  if (clean.startsWith('+')) return clean;
  if (clean.startsWith('00')) return '+' + clean.slice(2);
  if (clean.startsWith('0')) return '+90' + clean.slice(1);
  if (clean.startsWith('90') && clean.length === 12) return '+' + clean;
  return '+90' + clean;
}

async function sendWhatsApp(phone: string, message: string, token: string): Promise<boolean> {
  try {
    const formatted = formatPhone(phone);
    const res = await fetch(WHATSAPP_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formatted,
        type: 'text',
        text: { body: message },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { contactIds, message, campaignName } = await req.json();

    if (!contactIds?.length || !message) {
      return NextResponse.json({ error: 'contactIds and message required' }, { status: 400 });
    }

    const { serviceKey, metaToken } = getSecrets();
    const supabase = createClient(SUPABASE_URL, serviceKey);

    // Fetch contacts
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('id, name, phone_number, phone')
      .in('id', contactIds);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const contact of contacts || []) {
      const phone = contact.phone_number || contact.phone;
      if (!phone) {
        failed++;
        errors.push(`${contact.name}: telefon yok`);
        continue;
      }

      // Personalize message
      const personalMessage = message
        .replace(/\{\{ad[ıi]\}\}/gi, contact.name || 'Değerli Müşterimiz')
        .replace(/\{\{isim\}\}/gi, contact.name || 'Değerli Müşterimiz');

      const ok = await sendWhatsApp(phone, personalMessage, metaToken);
      if (ok) {
        sent++;
      } else {
        failed++;
        errors.push(`${contact.name} (${phone}): gönderim başarısız`);
      }

      // Rate limit: 100ms between messages
      await new Promise(r => setTimeout(r, 100));
    }

    return NextResponse.json({
      sent,
      failed,
      total: contactIds.length,
      campaignName,
      errors: errors.slice(0, 10), // max 10 hata goster
    });
  } catch (err) {
    console.error('Broadcast send error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
