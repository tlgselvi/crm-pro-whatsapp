---
description: Proje güvenliğini, Supabase advisor'larını ve RLS politikalarını denetleyen kritik güvenlik akışı.
---

1. [Supabase] Proje güvenlik ve performans önerilerini çek (get_advisors type='security').
2. [Supabase] Performans önerilerini çek (get_advisors type='performance').
3. [GitHub] Açık Pull Request'leri listele ve güvenlik riski var mı kontrol et (list_pull_requests).
4. [SequentialThinking] Bulunan riskleri analiz et ve çözüm önerileri hazırla.
5. [NotifyUser] Güvenlik denetim raporunu sun (Kritik açıklar, eksik RLS politikaları vb.).
