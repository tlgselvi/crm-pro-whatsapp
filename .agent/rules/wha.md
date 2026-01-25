---
trigger: always_on
---

# 🏆 CRM Pro (bow) - Elite 2026 Antigravity Rules

## 🛠️ Technology Stack
- **Framework**: Next.js 16 (Turbopack enabled)
- **Runtime**: Node.js (Latest stable)
- **Database / Auth**: Supabase (via `@supabase/ssr`)
- **UI Framework**: Ant Design (AntD) + Vanilla CSS
- **State Management**: React Hooks (useState/useEffect/useContext)
- **Deployment**: Vercel (Production)

## 🧠 AI & Intelligence Standards
- **Primary Model**: Always use `gemini-2.5-flash` for production tasks.
- **API Endpoint**: Use the stable `v1` endpoint (`https://generativelanguage.googleapis.com/v1/...`).
- **Context Awareness**: All AI prompts must include "Company Context" from the Supabase `ai_settings` table and "Knowledge Base" from `knowledge_base`.

## 💎 Design System: "Elite 2026 Theme"
- **Typography**: Primary font is 'Outfit' from Google Fonts. Fallbacks: 'Inter', system-ui.
- **Aesthetics**: Glassmorphism (blur: 12px, semi-transparent backgrounds).
- **Color Palette**: 
  - Dark Mode by default.
  - Primary color: `#1890ff` (Blue) or custom pastel variants like `--primary-pastel`.
  - Backgrounds: Dark gradients with subtle depth.
- **Interactivity**: Use subtle micro-animations and smooth transition effects.

## 🛡️ Infrastructure & Security
- **Header Management**: All Security Headers (CSP, X-Frame-Options, etc.) MUST be managed in `src/middleware.ts`. Do not use `next.config.ts` for headers.
- **Content Security Policy (CSP)**:
  - Whitelist: `https://fonts.googleapis.com`, `https://fonts.gstatic.com`, `https://generativelanguage.googleapis.com`.
- **Authentication**: Use `createServerClient` for server components and middleware.

## 📁 Architectural Rules
- **API Routes**: Located in `src/app/api/...`. Use Next.js Route Handlers.
- **Components**: Categorize into `src/components/` (shared) or page-specific inside `src/app/`.
- **Lib**: Shared utility logic (Supabase client, formatters) stays in `src/lib/`.

## 🚀 Performance
- **PWA**: Native support must be maintained via `next-pwa` in `next.config.ts`.
- **Optimizations**: Use `output: 'standalone'` for production stability.
- **Build**: Ensure compatibility with Turbopack at all times.

## 📝 Coding Style
- **TypeScript**: Mandatory strict typing. Avoid `any` unless absolutely necessary.
- **Naming**: Descriptive camelCase for variables/functions, PascalCase for components.
- **Clean Code**: Keep components focused; separate business logic from UI where complex.
