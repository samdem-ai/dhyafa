-- ============================================================================
-- 20260531120000_enums.sql
-- Dyafa (دافة) — Enum catalog (§2 of docs/10-canonical-spec.md)
-- Every `create type` appears EXACTLY ONCE here. No other migration redeclares.
-- Volatile category lists (amenities.category, notifications.type) are text+check,
-- declared inline on their tables (see schema migration), per spec.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Identity & roles
-- ---------------------------------------------------------------------------
create type app_role as enum (
  'guest','host_individual','host_hotel','hotel_staff','admin','super_admin'
);

create type host_kind as enum ('individual','hotel');

create type staff_role as enum ('reception','manager');

create type verification_status as enum ('unverified','pending','verified','rejected');

-- ---------------------------------------------------------------------------
-- Property
-- ---------------------------------------------------------------------------
create type property_status as enum ('draft','pending','approved','rejected','suspended');

create type listing_kind as enum ('single_unit','multi_room');

create type rejection_reason as enum (
  'incomplete_info','poor_photo_quality','prohibited_content',
  'duplicate','suspected_fraud','policy_violation','other'
);

-- ---------------------------------------------------------------------------
-- Booking — ONE canonical lifecycle (§3)
-- ---------------------------------------------------------------------------
create type booking_status as enum (
  'requested','declined','awaiting_payment','confirmed',
  'checked_in','completed','cancelled','no_show','expired'
);

-- ---------------------------------------------------------------------------
-- Payments — ONE method enum, ONE status enum
-- baridi_qr / baridi are RESERVED (deferred to v2, §11) — present in enums only.
-- ---------------------------------------------------------------------------
create type payment_method as enum ('edahabia','cib','baridi_qr');

create type payment_provider as enum ('chargily','baridi');

create type transaction_kind as enum ('payment','refund','payout','chargeback');

create type transaction_status as enum (
  'pending','processing','paid','failed',
  'refunded','partially_refunded','expired'
);

create type hold_status as enum ('held','captured','released','expired');

create type payout_status as enum ('pending','processing','paid','failed','on_hold');

-- ---------------------------------------------------------------------------
-- Reviews / moderation
-- ---------------------------------------------------------------------------
create type review_status as enum ('pending','published','hidden','removed');

create type dispute_status as enum ('open','under_review','resolved','rejected','cancelled');

create type dispute_category as enum (
  'refund','no_show','property_mismatch','damage','payment','other'
);

-- ---------------------------------------------------------------------------
-- Cancellation — drives the refund engine (§6)
-- ---------------------------------------------------------------------------
create type cancellation_tier as enum ('flexible','moderate','strict');

-- ---------------------------------------------------------------------------
-- Rate plans
-- ---------------------------------------------------------------------------
create type rate_plan_kind as enum ('base','weekend','seasonal','long_stay');

create type rate_adjust_type as enum ('percent','absolute');

-- ---------------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------------
create type conversation_kind as enum ('booking','inquiry','support');

-- ---------------------------------------------------------------------------
-- Merchandising
-- ---------------------------------------------------------------------------
create type rail_kind as enum (
  'near_you','popular_in_wilaya','beachfront','sahara_escapes',
  'top_rated','featured_collection','recently_viewed'
);
