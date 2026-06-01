// Shared Chargily Pay v2 helpers + minimal Supabase REST access.
// Deliberately uses ONLY Deno built-ins (Deno.serve, fetch, Web Crypto) and NO
// external imports (no deno.land / jsr / npm) so the functions serve even when
// the local edge runtime cannot reach a module CDN. Base URL per canonical spec.

export const CHARGILY_BASE_URL =
  Deno.env.get('CHARGILY_BASE_URL') ?? 'https://pay.chargily.net/test/api/v2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export interface CreateCheckoutInput {
  amountDzd: number;
  successUrl: string;
  failureUrl?: string;
  bookingId: string;
  bookingCode: string;
  webhookEndpoint?: string;
}

// Create a hosted Chargily checkout (server-side; secret key never leaves here).
export async function createChargilyCheckout(
  input: CreateCheckoutInput,
): Promise<{ id: string; checkout_url: string }> {
  const key = Deno.env.get('CHARGILY_SECRET_KEY');
  if (!key) throw new Error('CHARGILY_SECRET_KEY not set');

  const body: Record<string, unknown> = {
    amount: input.amountDzd, // whole DZD — no subunit
    currency: 'dzd',
    success_url: input.successUrl,
    failure_url: input.failureUrl ?? input.successUrl,
    payment_method: 'edahabia', // hosted page still offers Edahabia/CIB
    metadata: { booking_id: input.bookingId, booking_code: input.bookingCode },
  };
  if (input.webhookEndpoint) body.webhook_endpoint = input.webhookEndpoint;

  const res = await fetch(`${CHARGILY_BASE_URL}/checkouts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Chargily checkout failed: ${res.status} ${await res.text()}`);
  }
  const j = await res.json();
  return { id: j.id, checkout_url: j.checkout_url };
}

// HMAC-SHA256(rawBody, secret) hex, constant-time compared to the `signature` header.
export async function verifyChargilySignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  const secret =
    Deno.env.get('CHARGILY_WEBHOOK_SECRET') ?? Deno.env.get('CHARGILY_SECRET_KEY');
  if (!secret || !signature) return false;
  const k = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(rawBody));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

// ---- Minimal Supabase REST/RPC (service role; no supabase-js dependency) ----

function svcHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export async function rpc(fn: string, args: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: svcHeaders(),
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`rpc ${fn} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function restSelect<T = Record<string, unknown>>(path: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: svcHeaders() });
  if (!res.ok) throw new Error(`select failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function restInsert(
  table: string,
  row: Record<string, unknown>,
  opts?: { upsertOnConflict?: string },
): Promise<unknown> {
  const prefer = opts?.upsertOnConflict
    ? 'return=representation,resolution=merge-duplicates'
    : 'return=representation';
  const url =
    `${SUPABASE_URL}/rest/v1/${table}` +
    (opts?.upsertOnConflict ? `?on_conflict=${opts.upsertOnConflict}` : '');
  const res = await fetch(url, {
    method: 'POST',
    headers: svcHeaders({ Prefer: prefer }),
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`insert ${table} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// Read `sub` from an already-gateway-verified JWT (verify_jwt=true on the function).
export function decodeJwtSub(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const part = authHeader.slice(7).split('.')[1];
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return json.sub ?? null;
  } catch {
    return null;
  }
}

export const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
