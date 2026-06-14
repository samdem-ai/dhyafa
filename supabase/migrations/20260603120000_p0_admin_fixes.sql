-- =====================================================================
-- Phase 0 — dashboard rework bug fixes.
-- M-1: extend notifications.type CHECK so admin account/host actions stop
--      failing their notification INSERT. Today suspend/unsuspend/verify-host
--      emit 'account_suspended'/'account_reactivated'/'host_verified' and
--      force-cancel emits 'booking_cancelled' — but the original CHECK
--      (schema.sql) lacks the account/host types, so the whole Server Action
--      succeeds on its primary write then returns a red "violates check
--      constraint" error. Adding the missing types makes success show success.
-- =====================================================================

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (type in (
    'booking_requested','booking_accepted','booking_declined','booking_confirmed',
    'booking_cancelled','booking_reminder','checkin_instructions',
    'payment_succeeded','payment_failed','payment_expired',
    'payout_paid','review_received','review_reply','message_received',
    'listing_submitted','listing_approved','listing_rejected',
    'listing_changes_requested','listing_suspended',
    'dispute_opened','dispute_resolved','staff_invited',
    -- Phase 0 additions (admin account/host actions):
    'account_suspended','account_reactivated','host_verified','host_rejected','account_update'
  ));
