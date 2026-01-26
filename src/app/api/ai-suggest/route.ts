import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json({
        error: 'Deprecated',
        deprecated: true
    }, { status: 410 });
}
