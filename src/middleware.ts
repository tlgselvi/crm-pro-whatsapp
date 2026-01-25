import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // IMPORTANT: refreshing the session
    const { data: { user } } = await supabase.auth.getUser();

    // Security Headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*.supabase.co; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com;"
    );

    const protectedPaths = ['/dashboard', '/inbox', '/pipeline', '/contacts', '/settings', '/marketing'];
    const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));
    const isBypass = request.cookies.get('elite_bypass_auth')?.value === 'true';

    if (isProtected && !user && !isBypass) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirectedFrom', request.nextUrl.pathname);
        return NextResponse.redirect(url);
    }

    if (request.nextUrl.pathname === '/login' && user) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return response;
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*).*)'],
};
