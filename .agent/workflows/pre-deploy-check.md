---
description: Canlıya (Production) çıkmadan önce yapılması zorunlu olan son kontrol listesi.
---

1. [Shell] npx tsc --noEmit (TypeScript Type kontrolü).
2. [Shell] npm run lint (Kod standartları kontrolü).
// turbo
3. [Shell] npm run build (Production build simülasyonu - hata var mı?).
4. [Supabase] Local ve Remote DB şemalarını karşılaştır (inspect_schema).
5. [SequentialThinking] Kod veya Şema uyumsuzluğu var mı analiz et.
6. [NotifyUser] Sistem Production'a hazır mı? (Ready to Deploy onayı).
