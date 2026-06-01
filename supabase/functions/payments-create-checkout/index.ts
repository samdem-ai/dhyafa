// payments-create-checkout — server-side Chargily checkout creation (verify_jwt=true).
// Guest calls this with a booking_id; we verify ownership + awaiting_payment, create a
// Chargily hosted checkout, persist a pending transaction keyed by the checkout id, and
// return the checkout_url for the app to open. Secret key never leaves the server.

import {
  CORS,
  createChargilyCheckout,
  decodeJwtSub,
  restInsert,
  restSelect,
} from '../_shared/chargily.ts';

interface BookingRow {
  id: string;
  code: string;
  guest_id: string;
  status: string;
  total_dzd: number;
  commission_bps: number;
  commission_amount_dzd: number;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  try {
    const userId = decodeJwtSub(req.headers.get('Authorization'));
    if (!userId) return json({ error: 'unauthorized' }, 401);

    const { booking_id } = await req.json().catch(() => ({}));
    if (!booking_id) return json({ error: 'booking_id required' }, 400);

    const rows = await restSelect<BookingRow>(
      `bookings?id=eq.${booking_id}&select=id,code,guest_id,status,total_dzd,commission_bps,commission_amount_dzd`,
    );
    const b = rows[0];
    if (!b) return json({ error: 'booking not found' }, 404);
    if (b.guest_id !== userId) return json({ error: 'forbidden' }, 403);
    if (b.status !== 'awaiting_payment') {
      return json({ error: `booking not payable (status=${b.status})` }, 409);
    }

    const origin = req.headers.get('origin') ?? 'dyafa://';
    const checkout = await createChargilyCheckout({
      amountDzd: b.total_dzd,
      successUrl: `${origin}/booking/${b.id}?paid=1`,
      failureUrl: `${origin}/booking/${b.id}?failed=1`,
      bookingId: b.id,
      bookingCode: b.code,
    });

    // Pending transaction keyed by the Chargily checkout id (provider_ref); the
    // webhook later flips it to paid via apply_payment_event. Upsert = idempotent.
    await restInsert(
      'transactions',
      {
        booking_id: b.id,
        kind: 'payment',
        method: 'edahabia',
        provider: 'chargily',
        status: 'pending',
        amount_dzd: b.total_dzd,
        commission_bps: b.commission_bps,
        commission_amount_dzd: b.commission_amount_dzd,
        currency: 'DZD',
        provider_ref: checkout.id,
        idempotency_key: checkout.id,
        checkout_url: checkout.checkout_url,
        raw_payload: {},
      },
      { upsertOnConflict: 'idempotency_key' },
    );

    return json({ checkout_url: checkout.checkout_url, checkout_id: checkout.id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
