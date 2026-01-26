import { google } from '@/lib/ai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const maxDuration = 60; // Allow enough time for generation

// Schema for the AI response
const PersonaSchema = z.object({
    company_name: z.string().describe("The inferred name of the company from the description"),
    tone: z.enum(['professional', 'friendly', 'formal']).describe("The most suitable communication tone"),
    system_instructions: z.string().describe("Concise system instructions for the AI bot (max 300 chars) that defines how it should behave based on the business type"),
    initial_knowledge_base: z.array(z.object({
        topic: z.string(),
        content: z.string()
    })).length(5).describe("5 essential Q&A pairs that a customer would likely ask this specific business")
});

export async function POST(req: Request) {
    try {
        const { description } = await req.json();
        const cookieStore = await cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
                        } catch { }
                    }
                }
            }
        );

        // Check Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Generate Persona using Gemini 2.5 Flash
        const { object } = await generateObject({
            model: google('gemini-2.5-flash'),
            schema: PersonaSchema,
            prompt: `
      Analyze this business description and create a perfect AI text-based receptionist persona for them.
      
      BUSINESS DESCRIPTION: "${description}"
      
      Requirements:
      1. Infer the company name. If not explicitly stated, generate a creative, modern name suitable for the industry.
      2. Choose the best tone (professional, friendly, or formal).
      3. Write 'system_instructions' content for the AI. It should be directive (e.g. "You are X. Treat customers like Y...")
      4. Generate exactly 5 'initial_knowledge_base' items. These must be the most critical questions customers ask (e.g. "Pricing", "Hours", "Services"). The answers should be realistic placeholders based on the description.
      `,
        });

        // Save Settings
        const { error: settingsError } = await supabase.from('ai_settings').upsert({
            // We assume single tenant/user for now or user_id association handled by RLS if table has it.
            // Since original code showed select single, we stick to that pattern (id from existing or new).
            // Best approach: get existing ID if any.
            // Actually, we'll fetch ID first.
            id: (await supabase.from('ai_settings').select('id').single()).data?.id,
            company_name: object.company_name,
            tone: object.tone,
            system_instructions: object.system_instructions,
            updated_at: new Date().toISOString()
        });

        if (settingsError) throw new Error('Settings save failed: ' + settingsError.message);

        // Save Knowledge Base
        // First, clear auto-generated ones? No, just append is safer, but user might want fresh start.
        // Let's just insert.
        const kbInserts = object.initial_knowledge_base.map(item => ({
            topic: item.topic,
            content: item.content
        }));

        const { error: kbError } = await supabase.from('knowledge_base').insert(kbInserts);

        if (kbError) throw new Error('KB save failed: ' + kbError.message);

        return NextResponse.json({ success: true, data: object });

    } catch (error: any) {
        console.error('Persona Generation Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
