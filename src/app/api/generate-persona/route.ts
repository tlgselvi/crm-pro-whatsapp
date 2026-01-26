import { NextRequest, NextResponse } from 'next/server';

// RADICAL DEBUG MODE
export async function POST(request: NextRequest) {
    console.log('DEBUG: Function started - Radical Mode');
    return NextResponse.json({ status: 'ok', debug: 'radical', message: 'If you see this, the route is reachable.' });
}

// ORIGINAL CODE COMMENTED OUT FOR DEBUGGING
