import { NextResponse } from 'next/server';

// DEPRECATED: Migrated to Vercel AI SDK (src/app/api/chat/route.ts)
// This file is kept temporarily to prevent 404s if any client still calls it, 
// but it no longer executes logic.
export async function POST() {
    return NextResponse.json({
        error: 'This endpoint is deprecated. Please use /api/chat with the AI SDK.',
        deprecated: true
    }, { status: 410 }); // 410 Gone
}
