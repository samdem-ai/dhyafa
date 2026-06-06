/**
 * Session bridge Route Handler.
 *
 * The admin signs in client-side with the anon Supabase client (which returns an
 * access + refresh token). Because this app does not depend on `@supabase/ssr`,
 * we persist those tokens server-side ourselves as **httpOnly** cookies so that
 * Server Components / Server Actions can re-validate the caller via `requireAdmin()`
 * (see lib/auth.ts). httpOnly means the tokens are not readable by client JS,
 * which mitigates token theft via XSS.
 *
 *   POST   /api/session   { access_token, refresh_token, expires_in? }  → set cookies
 *   DELETE /api/session                                                 → clear cookies (sign-out)
 *
 * Note: this endpoint only *stores* whatever token the client presents. The token
 * is treated as untrusted until `adminSupabase.auth.getUser(token)` validates it
 * server-side on every protected request — possession of the cookie alone grants
 * nothing without a valid JWT and an admin role row.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../../../lib/auth';

export const runtime = 'nodejs';
// Never cache auth state.
export const dynamic = 'force-dynamic';

interface SessionBody {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: SessionBody;
  try {
    body = (await request.json()) as SessionBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const accessToken = body.access_token;
  const refreshToken = body.refresh_token;

  if (!isNonEmptyString(accessToken) || !isNonEmptyString(refreshToken)) {
    return NextResponse.json({ error: 'missing_tokens' }, { status: 400 });
  }

  // Access-token cookie lifetime tracks the JWT expiry when provided; the refresh
  // cookie outlives it so the session can be renewed. We cap the access cookie at
  // the supplied `expires_in` (seconds) or 1h, and the refresh cookie at 30 days.
  const accessMaxAge =
    typeof body.expires_in === 'number' && body.expires_in > 0
      ? Math.min(body.expires_in, 60 * 60)
      : 60 * 60;

  // Mark cookies Secure only when actually served over HTTPS. NODE_ENV is the
  // wrong signal: the container runs NODE_ENV=production even on plain HTTP, which
  // would set Secure and make the browser drop the cookie — bouncing the user
  // back to sign-in (the VPS is served over http://<ip>:port today).
  const proto =
    request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');
  const secure = proto === 'https';
  const store = cookies();

  store.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: accessMaxAge,
  });

  store.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(): Promise<NextResponse> {
  const store = cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
  return NextResponse.json({ ok: true });
}
