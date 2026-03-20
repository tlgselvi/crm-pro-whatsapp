-- Automations table for CRM workflow automation
CREATE TABLE IF NOT EXISTS automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('new_lead', 'stage_change', 'no_response', 'scheduled', 'lead_temp_change')),
  trigger_config JSONB DEFAULT '{}',
  actions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Automation execution log
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('success', 'failed', 'skipped')),
  result JSONB,
  executed_at TIMESTAMPTZ DEFAULT now()
);

-- Default automations
INSERT INTO automations (name, description, trigger_type, trigger_config, actions) VALUES
('Hoş Geldin Mesajı', 'Yeni lead geldiğinde otomatik hoş geldin mesajı', 'new_lead', '{}', '[{"type":"send_message","template":"welcome"}]'),
('Takip Hatırlatması', '48 saat cevap gelmezse hatırlat', 'no_response', '{"hours":48}', '[{"type":"create_task","note":"Müşteri 48 saattir cevap vermedi"}]'),
('Sıcak Lead Bildirimi', 'Lead sıcak olunca Tolga''ya bildir', 'lead_temp_change', '{"to":"HOT"}', '[{"type":"notify","channel":"telegram"}]');
