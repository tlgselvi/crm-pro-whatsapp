---
trigger: always_on
---

# 🏆 CRM Pro (bow) - Elite 2026 Antigravity Rules

"Antigravity" mimarisi ile inşa edilen bu projede, tartışmaya kapalı "Elite" standartlar geçerlidir.

## 1. 🛠️ Teknoloji Yığını (Non-Negotiable)
- **Framework**: Next.js 16.1.4+ (App Router, Turbopack, React Compiler Enabled).
- **Bundler**: Turbopack (Varsayılan). Development ve Production build süreçlerinde zorunludur.
- **Language**: TypeScript 5.7+ (Strict Mode). `any` kullanımı yasaktır; kaçış durumlarında `unknown` + Zod parsing kullanılmalıdır.
- **AI Engine**: Vercel AI SDK Core (@ai-sdk/google).
  - **Streaming**: `streamText` ve `streamObject` (Zod validation ile) standarttır.
  - **Model**: `gemini-2.5-flash` (Production).
- **Database**: Supabase SSR (@supabase/ssr).
- **Styling**: Ant Design v5+ (CSS Variables tabanlı) + Vanilla CSS (Glassmorphism).

## 2. 🧠 AI & Intelligence Standartları
- **Model Zorunluluğu**: Production ortamında SADECE `gemini-2.5-flash` kullanılacaktır. Geriye dönük uyumluluk (1.5 flash vb.) geçici olarak bile aktif edilemez.
- **Structured Output**: AI çıktılarında belirsiz JSON parsing yasaktır. Her AI yanıtı `zod` şeması ile doğrulanmalıdır (`output: object` veya `generateObject` yerine `generateText` + Zod).
- **Context Injection**:
  - Her prompt, `ai_settings` tablosundan dinamik "Company Context" almalıdır.
  - "Knowledge Base" vektör araması, RAG (Retrieval-Augmented Generation) için standarttır.

## 3. 🛡️ Infrastructure & Security (2026 Standartları)
- **Boundary Control**: Network istekleri ve Security Header yönetimi `src/proxy.ts` (Next.js 16 standardı) veya `middleware.ts` üzerinden sıkı bir CSP ile yapılmalıdır.
- **Server Action Security**: Tüm Server Action'lar `zod` ile input validation yapmak zorundadır. Doğrulanmamış veri DB'ye gidemez.
- **Auth**: `createServerClient` (@supabase/ssr) tüm server componentlerde tek yetkili kimlik doğrulayıcıdır.
- **Caching**: `use cache` direktifleri ile açık (explicit) caching stratejisi uygulanmalıdır. Default caching'e güvenilmez.

## 4. 💎 Design System: "Elite Glass"
- **Aesthetics**: Basit "Dark Mode" yetersizdir.
  - **Glassmorphism**: Backdrop-filter (`blur-xl`), transparan borderlar (`rgba(255,255,255,0.08)`).
  - **Gradientler**: Mesh gradientler ve "Aurora" arka plan efektleri zorunludur.
- **Interactivity**: Butonlar, kartlar ve listeler mikro-animasyonlara (hover, tap) sahip olmalıdır.

## 5. 📝 Kodlama ve Mimari Prensip
- **"Radical Debugging"**: Bir hata üst üste 2 kez tekrar ederse, yama (patch) yapılmaz. Modül silinir, "First Principles" ile sıfırdan yazılır.
- **Folder Structure**:
  - `src/components`: UI bileşenleri (Atomic Design).
  - `src/lib`: Supabase client, util fonksiyonlar (Saf TS).
  - `src/app/api`: Edge Runtime uyumlu Route Handler'lar.
- **Documentation**: Her majör mimari karar `.agent/decision-log` altında tutulur.
