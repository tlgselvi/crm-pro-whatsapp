---
description: Girilen ham kullanıcı isteğini, 'Bow Architect' mimarisine uygun, teknik ve detaylı bir 'Architectural Prompt' formatına çevirir.
---

1. [SequentialThinking] Kullanıcının ham isteğini analiz et. Niyet (Intent), Bağlam (Context) ve Kısıtlamaları (Constraints) ayrıştır.
2. [ReadLocal] `.agent/rules/bow-architect.md` dosyasını oku.
3. [NotifyUser] İsteği aşağıdaki "Bow Architect Prompt" formatına çevirerek kullanıcıya sun:

```markdown
# 🏹 Refined Architect Prompt

**Komut Önerisi:** `/implement-feature [Kısa Başlık]`

## 🧠 Bağlam (Context)
[Bu özelliğin projenin neresinde durduğuna dair açıklama. Örn: Satış modülü, Auth akışı vb.]

## 🎯 Niyet (Intent & User Story)
- **Kullanıcı:** [Kim kullanacak?]
- **Aksiyon:** [Ne yapmak istiyor?]
- **Amaç:** [Neden istiyor? Değer nedir?]

## 🧱 Teknik Kısıtlamalar (Constraints)
- **UI/UX:** [Hangi bileşenler? Örn: Drawer, Modal, Glassmorphism]
- **Veri:** [Supabase tablosu, ilişki yapısı]
- **Kritik Kurallar:** [Optimistic UI, Realtime, Security vb.]
```
