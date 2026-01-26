---
description: Yeni bir özellik geliştirmeye başlarken kullanılan kapsamlı hazırlık döngüsü.
---

1. [GitHub] İstenen özellik ile ilgili açık issue var mı kontrol et (search_issues).
2. [SequentialThinking] Özelliğin teknik gereksinimlerini ve veritabanı ihtiyaçlarını analiz et.
3. [Supabase] Mevcut veritabanı şemasını analiz et (inspect_schema).
> *Not: Bu adımda `supabase db diff` veya `supabase inspect db` komutları kullanılır.*
// turbo
4. [GitHub] Yeni özellik için 'feature/özellik-adi' formatında branch oluştur (create_branch).
5. [Shell] Yeni migrasyon dosyası oluştur: `supabase migration new <feature-name>`
6. [Supabase] Değişiklikleri uygula ve diff al (run_migration).
6. [NotifyUser] Hazırlık tamamlandı. Analiz sonuçlarını ve oluşturulan branch'i raporla.
