-- ============================================
-- DESE CRM WhatsApp Entegrasyon Eklentileri
-- Tarih: 2026-03-20
-- Bu bloğu Supabase SQL Editor'da çalıştır
-- ============================================

-- Contacts tablosuna DESE CRM alanları ekle
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS segment VARCHAR(30);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_temperature VARCHAR(10) DEFAULT 'COLD';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(30) DEFAULT 'new_lead';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_message TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS next_action TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS offer_amount DECIMAL(12,2);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS won_amount DECIMAL(12,2);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMP WITH TIME ZONE;

-- Pipeline aşamaları tablosu
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  stage_order INTEGER NOT NULL,
  color VARCHAR(7) DEFAULT '#2196F3'
);

INSERT INTO pipeline_stages (name, display_name, stage_order, color) VALUES
  ('new_lead', 'Yeni Lead', 1, '#2196F3'),
  ('qualification', 'Değerlendirme', 2, '#FF9800'),
  ('first_contact', 'İlk İletişim', 3, '#9C27B0'),
  ('site_visit', 'Keşif Randevusu', 4, '#00BCD4'),
  ('offer_sent', 'Teklif Gönderildi', 5, '#FFC107'),
  ('negotiation', 'Müzakere', 6, '#E91E63'),
  ('won', 'Kazanıldı ✅', 7, '#4CAF50'),
  ('lost', 'Kaybedildi ❌', 8, '#F44336')
ON CONFLICT (name) DO NOTHING;

-- Conversations tablosuna status_type ekle (zaten varsa atla)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status_type VARCHAR(20) DEFAULT 'bot_active';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES auth.users(id);

-- Pipeline stages RLS
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Enable all for pipeline_stages" ON pipeline_stages FOR ALL USING (true) WITH CHECK (true);

-- Performans index'leri
CREATE INDEX IF NOT EXISTS idx_contacts_segment ON contacts(segment);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_temperature ON contacts(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_contacts_pipeline_stage ON contacts(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_score ON contacts(lead_score DESC);
