---
description: Veritabanı şema değişikliği sonrası güvenlik, type güncelleme ve test döngüsü.
---

1. [Supabase] Mevcut local şema farklarını analiz et: `supabase db diff`
2. [Supabase] Migrasyon dosyasını oluştur ve uygula: `supabase migration new <name>` ardından `supabase db push --local`
// turbo
3. [Shell] Type'ları güncelle: `npx supabase gen types typescript --local > src/lib/supabase.types.ts`
4. [Shell] npx tsc --noEmit (Type güvenliğini doğrula).
// turbo
5. [Shell] npm run lint (Lint hatalarını kontrol et).
6. [GitHub] 'chore: update schema and types' mesajı ile değişiklikleri commit'le.
7. [NotifyUser] Veritabanı ve tipler senkronize edildi, testler geçti.
