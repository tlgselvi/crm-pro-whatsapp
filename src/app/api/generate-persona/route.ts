import { NextRequest, NextResponse } from 'next/server';

// RADICAL DEBUG MODE
export async function POST(request: NextRequest) {
    console.log('DEBUG: Function started - Radical Mode');
    return NextResponse.json({ status: 'ok', debug: 'radical', message: 'If you see this, the route is reachable.' });
}

// ORIGINAL CODE COMMENTED OUT FOR DEBUGGING
/*
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export async function POST_ORIGINAL(request: NextRequest) {
    try {
        const { description, researchData } = await request.json();
        // ... original logic ...
    } catch (error: any) {
        console.error('CRITICAL API ERROR:', error);
         return NextResponse.json({
             error: error.message || 'Unknown internal error',
             status: 'error'
         }, { status: 500 });
    }
}
*/
