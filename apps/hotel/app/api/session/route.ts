/**
 * Session bridge Route Handler (hotel dashboard).
 *
 * The host signs in client-side with the anon Supabase client (which returns an
 * access + refresh token). Because this app does not depend on `@supabase/ssr`,
 * we persist those tokens server-side ourselves as **httpOnly** cookies so that
 * Server Components / Server Actions can re-validate the caller via `requireHost()`
 * (see lib/auth.ts). httpOnly means the tokens are not readable by client JS,
 * which mitigates token theft via XSS.
 *
 *   POST   /api/session   { access_token, refresh_token, expires_in? }  → set cookies
 *   DELETE /api/session                                                 → clear cookies (sign-out)
 *
 * Note: this endpoint only *stores* whatever token the client presents. The token
 * is treated as untrusted until `adminSupabase.auth.getUser(token)` validates it
 * server-side on every protected request — possession of the cookie alone grants
 * nothing without a valid JWT and a host role.
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

  // Access cookie lifetime tracks the JWT expiry (capped at 1h); the refresh
  // cookie outlives it (30 days) so the session can be renewed.
  const accessMaxAge =
    typeof body.expires_in === 'number' && body.expires_in > 0
      ? Math.min(body.expires_in, 60 * 60)
      : 60 * 60;

  const secure = process.env.NODE_ENV === 'production';
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
