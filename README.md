# DESE Havuz CRM — WhatsApp Entegrasyonlu Müşteri Yönetim Sistemi

WhatsApp botundan gelen müşterileri otomatik kaydeden, pipeline'da takip eden ve satışa dönüştüren modern CRM sistemi.

## ✨ Özellikler

- 💬 **Gerçek Zamanlı Sohbet** — WhatsApp mesajları anında CRM'e düşer
- 📊 **Pipeline Yönetimi** — 8 aşamalı Kanban board (Yeni Lead → Kazanıldı)
- 🔥 **Lead Scoring** — Sıcak/Ilık/Soğuk otomatik sınıflandırma
- 🤖 **n8n Entegrasyonu** — WhatsApp botu müşterileri otomatik kaydeder
- 📱 **WhatsApp API** — Meta Cloud API ile direkt mesajlaşma
- 🏊 **Segment Takibi** — Yeni Havuz / Bakım / Malzeme / Tadilat / Sauna-Spa
- 📈 **Dashboard KPI'lar** — Bu ay lead, sıcak lead, pipeline değeri

## 🛠 Teknoloji

- **Frontend:** Next.js 16, React 19, TypeScript
- **UI:** Ant Design Pro, Tailwind CSS
- **Veritabanı:** Supabase (PostgreSQL + Realtime)
- **Deployment:** Vercel
- **Bot:** n8n + Claude Sonnet 4.6

## 🚀 Kurulum

### 1. Repo Klonla
```bash
git clone https://github.com/tlgselvi/crm-pro-whatsapp.git dese-crm
cd dese-crm
npm install
```

### 2. Ortam Değişkenleri
`.env.local` oluştur:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xntwzphvzuvonvlfaaeu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... (Supabase > Settings > API > service_role)
WEBHOOK_SECRET=dese-crm-webhook-2026  (n8n ile aynı olmalı)
WHATSAPP_PHONE_NUMBER_ID=981728991694454
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_VERIFY_TOKEN=crm_webhook_2026
NEXT_PUBLIC_APP_URL=https://crm.poolfab.com.tr
```

### 3. Supabase Schema
Supabase SQL Editor'da çalıştır:
1. `supabase/schema.sql` — Temel tablolar
2. `supabase/schema-dese-addons.sql` — DESE CRM eklentileri

### 4. Geliştirme Sunucusu
```bash
npm run dev
```

## 🔗 n8n Entegrasyonu

n8n WhatsApp workflow'una HTTP Request node ekle:

```
Method: POST
URL: https://crm.poolfab.com.tr/api/webhook/n8n-lead
Headers:
  x-webhook-token: dese-crm-webhook-2026
  Content-Type: application/json

Body:
{
  "name": "{{$json.contacts[0].profile.name}}",
  "phone": "{{$json.contacts[0].wa_id}}",
  "segment": "{{$json['segment']}}",
  "leadScore": "{{$json['lead_score']}}",
  "leadTemp": "{{$json['lead_temp']}}",
  "pipelineStage": "new_lead",
  "firstMessage": "{{$json.messages[0].text.body}}",
  "source": "whatsapp_organic"
}
```

## 📊 Pipeline Aşamaları

| Aşama | Açıklama |
|-------|----------|
| Yeni Lead | İlk WhatsApp mesajı |
| Değerlendirme | Bot sorular soruyor |
| İlk İletişim | Bot tamamlandı |
| Keşif Randevusu | Tarih belirlendi |
| Teklif Gönderildi | Fiyat iletildi |
| Müzakere | Karşı teklif |
| Kazanıldı ✅ | Kapora/sözleşme |
| Kaybedildi ❌ | Vazgeçti/rakibe gitti |

## 🔥 Lead Scoring

| Skor | Sıcaklık | Aksiyon |
|------|----------|---------|
| 80+ | 🔴 Sıcak | Anında Tolga'ya bildir |
| 50-79 | 🟡 Ilık | Referans proje gönder |
| <50 | 🟢 Soğuk | Bilgilendirici içerik |

## 🌐 Deploy

```bash
vercel --prod
```

Domain: `crm.poolfab.com.tr` → Vercel dashboard'dan ekle.
