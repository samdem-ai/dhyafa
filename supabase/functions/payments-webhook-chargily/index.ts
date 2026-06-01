// payments-webhook-chargily — Chargily Pay webhook (verify_jwt=false; public, HMAC-secured).
// Verifies the `signature` header (HMAC-SHA256 of the raw body), dedupes on the event id
// via webhook_events, then routes paid/failed/canceled through apply_payment_event — the
// single confirm path shared with dev_simulate_payment. Always 200 after dedupe so Chargily
// stops retrying. Idempotent.

import { restInsert, rpc, verifyChargilySignature } from '../_shared/chargily.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const raw = await req.text();
  const sig = req.headers.get('signature');
  if (!(await verifyChargilySignature(raw, sig))) {
    return new Response('invalid signature', { status: 401 });
  }

  let evt: { id?: string; type?: string; data?: { id?: string; amount?: number } };
  try {
    evt = JSON.parse(raw);
  } catch {
    return new Response('bad json', { status: 400 });
  }

  const type = evt.type ?? '';
  const checkoutId = evt.data?.id ?? '';
  const eventId = evt.id ?? checkoutId; // stable per-event id; fall back to checkout id
  const amount = typeof evt.data?.amount === 'number' ? evt.data.amount : null;

  // Dedupe: unique(provider, provider_event_id). Duplicate => already processed.
  try {
    await restInsert('webhook_events', {
      provider: 'chargily',
      provider_event_id: eventId,
      event_type: type,
      provider_ref: checkoutId,
      signature: sig,
      signature_ok: true,
      payload: evt,
    });
  } catch (e) {
    const msg = String(e);
    if (msg.includes('23505') || msg.toLowerCase().includes('duplicate')) {
      return new Response('duplicate', { status: 200 });
    }
    return new Response(`ingest error: ${msg}`, { status: 500 });
  }

  const kind =
    type === 'checkout.paid'
      ? 'paid'
      : type === 'checkout.failed'
        ? 'failed'
        : type === 'checkout.canceled'
          ? 'canceled'
          : null;

  if (kind && checkoutId) {
    await rpc('apply_payment_event', {
      p_provider: 'chargily',
      p_provider_ref: checkoutId,
      p_kind: kind,
      p_amount_dzd: amount,
      p_gateway_fee_dzd: 0,
      p_event_id: eventId,
    });
  }

  return new Response('ok', { status: 200 });
});
