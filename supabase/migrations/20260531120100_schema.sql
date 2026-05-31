-- ============================================================================
-- 20260531120100_schema.sql
-- Dyafa (دافة) — Full table catalog (§4 of docs/10-canonical-spec.md)
-- Tables, columns, PK/FK, checks, generated columns, unique constraints, indexes.
-- RLS is ENABLED here (force + policies live in the rls migration).
-- Conventions: plural snake_case; uuid PKs default gen_random_uuid();
-- money = integer *_dzd >= 0; currency char(3) locked to 'DZD'; locales _ar/_fr/_en.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto       with schema extensions;  -- gen_random_uuid(), crypt()
create extension if not exists btree_gist      with schema extensions;  -- exclusion constraint on bookings
create extension if not exists postgis         with schema extensions;  -- geography(Point) geo / geo_fuzzed

-- ===========================================================================
-- 4.3 Geography & master  (created first — referenced by identity/property FKs)
-- ===========================================================================

create table public.wilayas (
  code        smallint primary key,                  -- 1..69, NOT range-checked (spec)
  name_ar     text not null,
  name_fr     text not null,
  name_en     text,
  ar_slug     text,
  lat         numeric(9,6),
  lng         numeric(9,6),
  is_active   boolean not null default true
);

create table public.communes (
  id          integer primary key,
  wilaya_code smallint not null references public.wilayas(code),
  name_ar     text,
  name_fr     text,
  name_en     text,
  post_code   text
);
create index communes_wilaya_code_idx on public.communes(wilaya_code);

create table public.property_types (
  id          smallint primary key,
  slug        text unique not null,
  name_ar     text,
  name_fr     text,
  name_en     text,
  kind        listing_kind not null,
  icon        text,
  sort_order  smallint
);

create table public.amenities (
  id          smallint primary key,
  slug        text unique not null,
  category    text check (category in ('general','kitchen','bathroom','safety','accessibility','outdoor')),
  name_ar     text,
  name_fr     text,
  name_en     text,
  icon        text
);

create table public.cancellation_policies (
  tier                   cancellation_tier primary key,
  refund_full_until_hours int not null,
  refund_partial_pct      int not null check (refund_partial_pct between 0 and 100),
  partial_until_hours     int,
  service_fee_refundable  boolean not null default false,
  name_ar                 text,
  name_fr                 text,
  name_en                 text,
  description_ar          text,
  description_fr          text,
  description_en          text
);

-- ===========================================================================
-- 4.1 Identity & roles
-- ===========================================================================

create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  full_name           text,
  display_name        text not null,
  avatar_path         text,                       -- storage object path, not URL
  phone_e164          text unique,                -- +213...
  phone_verified_at   timestamptz,
  preferred_locale    text not null default 'ar' check (preferred_locale in ('ar','fr','en')),
  default_wilaya_code smallint references public.wilayas(code),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.user_roles (
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        app_role not null,
  granted_by  uuid references public.profiles(id),
  granted_at  timestamptz not null default now(),
  primary key (user_id, role)
);

-- ===========================================================================
-- 4.2 Host & staff
-- ===========================================================================

create table public.host_profiles (
  id                     uuid primary key default gen_random_uuid(),
  owner_id               uuid not null unique references auth.users(id) on delete cascade,
  kind                   host_kind not null,
  legal_name             text,
  display_name           text not null,
  bio_ar                 text,
  bio_fr                 text,
  bio_en                 text,
  id_doc_type            text check (id_doc_type in ('cni','passport','permis')),
  id_doc_path            text,                    -- private kyc-docs bucket
  rc_number              text,                    -- Registre de Commerce (hotels)
  nif                    text,                    -- tax id
  identity_status        verification_status not null default 'unverified',
  payout_status          verification_status not null default 'unverified',
  payout_method          text check (payout_method in ('ccp','bank')),
  payout_rib             text,                    -- 20-digit RIB/CCP (masked/encrypted)
  commission_bps_override int check (commission_bps_override between 0 and 5000),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table public.hotel_staff (
  id              uuid primary key default gen_random_uuid(),
  host_profile_id uuid not null references public.host_profiles(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  staff_role      staff_role not null,            -- reception | manager
  is_active       boolean not null default true,
  invite_token    text unique,
  invited_at      timestamptz,
  accepted_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (host_profile_id, user_id)
);
create index hotel_staff_user_id_idx on public.hotel_staff(user_id);
create index hotel_staff_host_profile_id_idx on public.hotel_staff(host_profile_id);

-- ===========================================================================
-- 4.4 Property & rooms
-- ===========================================================================

create table public.properties (
  id                 uuid primary key default gen_random_uuid(),
  host_profile_id    uuid not null references public.host_profiles(id) on delete restrict,
  property_type_id   smallint not null references public.property_types(id),
  listing_kind       listing_kind not null,       -- denormalized at insert
  title_ar           text,
  title_fr           text,
  title_en           text,
  description_ar     text,
  description_fr     text,
  description_en     text,
  status             property_status not null default 'draft',
  wilaya_code        smallint not null references public.wilayas(code),
  commune_id         integer references public.communes(id),
  address_line       text,
  lat                numeric(9,6),
  lng                numeric(9,6),
  geo                extensions.geography(Point,4326),  -- exact, maintained from lat/lng
  geo_fuzzed         extensions.geography(Point,4326),  -- rounded ~400m, public-safe (§9)
  cancellation_tier  cancellation_tier not null default 'moderate'
                       references public.cancellation_policies(tier),
  checkin_time       time not null default '14:00',
  checkout_time      time not null default '12:00',
  house_rules_ar     text,
  house_rules_fr     text,
  house_rules_en     text,
  instant_book       boolean not null default false,
  currency           char(3) not null default 'DZD' check (currency = 'DZD'),
  min_nights         int not null default 1 check (min_nights >= 1),
  max_nights         int,
  cover_photo_path   text,
  rating_avg         numeric(3,2) not null default 0 check (rating_avg between 0 and 5),
  review_count       int not null default 0,
  submitted_at       timestamptz,
  approved_at        timestamptz,
  reviewed_by        uuid references public.profiles(id),
  rejection_reason   rejection_reason,
  rejection_note     text,
  published_at       timestamptz,
  deleted_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
-- Search by wilaya + dates + guests (the date/guest predicates resolve through
-- availability/room_types; this index backs the wilaya + visibility filter on search).
create index properties_search_idx
  on public.properties(wilaya_code, status)
  where deleted_at is null;
create index properties_host_profile_id_idx on public.properties(host_profile_id);
create index properties_property_type_id_idx on public.properties(property_type_id);
create index properties_commune_id_idx on public.properties(commune_id);
create index properties_status_idx on public.properties(status) where deleted_at is null;
-- Geo proximity ("near you" / map): GiST on the public-safe fuzzed point + exact point.
create index properties_geo_fuzzed_gix on public.properties using gist (geo_fuzzed);
create index properties_geo_gix on public.properties using gist (geo);

create table public.room_types (
  id                  uuid primary key default gen_random_uuid(),
  property_id         uuid not null references public.properties(id) on delete cascade,
  name_ar             text,
  name_fr             text,
  name_en             text,
  is_default          boolean not null default false,
  base_occupancy      smallint,
  max_occupancy       smallint not null check (max_occupancy > 0),
  max_adults          smallint,
  max_children        smallint,
  bed_config          jsonb not null default '[]',
  size_sqm            smallint,
  base_price_dzd      integer not null check (base_price_dzd >= 0),
  weekend_price_dzd   integer check (weekend_price_dzd >= 0),
  cleaning_fee_dzd    integer not null default 0 check (cleaning_fee_dzd >= 0),
  extra_guest_fee_dzd integer not null default 0 check (extra_guest_fee_dzd >= 0),
  inventory_count     smallint not null default 1 check (inventory_count >= 1),
  is_active           boolean not null default true,
  sort_order          smallint,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index room_types_property_id_idx on public.room_types(property_id);
-- Exactly one default unit per property.
create unique index room_types_one_default_per_property
  on public.room_types(property_id) where is_default;

create table public.property_photos (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties(id) on delete cascade,
  room_type_id uuid references public.room_types(id) on delete set null,
  storage_path text not null,
  alt_ar       text,
  alt_fr       text,
  alt_en       text,
  sort_order   smallint not null default 0,
  is_cover     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index property_photos_property_id_idx on public.property_photos(property_id);
create index property_photos_room_type_id_idx on public.property_photos(room_type_id);

create table public.property_amenities (
  property_id uuid references public.properties(id) on delete cascade,
  amenity_id  smallint references public.amenities(id),
  primary key (property_id, amenity_id)
);

create table public.room_amenities (
  room_type_id uuid references public.room_types(id) on delete cascade,
  amenity_id   smallint references public.amenities(id),
  primary key (room_type_id, amenity_id)
);

-- ===========================================================================
-- 4.5 Availability & inventory holds  (+ rate plans)
-- NOTE: bookings & inventory_holds reference each other; bookings is created
-- below, then inventory_holds. availability/rate_plans only need room_types.
-- ===========================================================================

create table public.availability (
  id                  uuid primary key default gen_random_uuid(),
  room_type_id        uuid not null references public.room_types(id) on delete cascade,
  date                date not null,
  units_open          smallint not null check (units_open >= 0),
  price_override_dzd  integer check (price_override_dzd >= 0),
  min_stay            smallint check (min_stay >= 1),
  max_stay            smallint,
  is_closed           boolean not null default false,
  closed_to_arrival   boolean not null default false,
  closed_to_departure boolean not null default false,
  source              text not null default 'manual',  -- reserved for v2 iCal/channel sync
  updated_at          timestamptz not null default now(),
  unique (room_type_id, date)
);
-- Availability lookup: (room_type_id, date) covered by the unique constraint above;
-- add a range-friendly index for span scans during search/booking.
create index availability_room_date_idx on public.availability(room_type_id, date);
create index availability_date_idx on public.availability(date) where is_closed = false;

create table public.rate_plans (
  id                   uuid primary key default gen_random_uuid(),
  room_type_id         uuid not null references public.room_types(id) on delete cascade,
  kind                 rate_plan_kind not null,
  label                text,
  date_start           date,
  date_end             date,
  weekday_mask         smallint,                  -- bitmask Sat..Fri
  min_nights_threshold smallint,
  adjust_type          rate_adjust_type,
  adjust_value_dzd     integer,
  price_dzd            integer check (price_dzd >= 0),
  priority             smallint not null default 0,
  is_active            boolean not null default true
);
create index rate_plans_room_type_id_idx on public.rate_plans(room_type_id);
create index rate_plans_active_idx on public.rate_plans(room_type_id, priority desc) where is_active;

-- ===========================================================================
-- 4.6 Bookings
-- ===========================================================================

create table public.bookings (
  id                   uuid primary key default gen_random_uuid(),
  code                 text unique not null,        -- e.g. BK-2026-7F3A2
  property_id          uuid not null references public.properties(id) on delete restrict,
  room_type_id         uuid not null references public.room_types(id) on delete restrict,
  guest_id             uuid not null references public.profiles(id) on delete restrict,
  host_profile_id      uuid not null references public.host_profiles(id),
  check_in             date not null,
  check_out            date not null,
  stay_range           daterange generated always as (daterange(check_in, check_out, '[)')) stored,
  nights               int generated always as (check_out - check_in) stored,
  adults               smallint not null default 1 check (adults > 0),
  children             smallint not null default 0,
  units                smallint not null default 1 check (units > 0),
  status               booking_status not null,     -- NO default — set by create_booking RPC
  currency             char(3) not null default 'DZD' check (currency = 'DZD'),
  nightly_subtotal_dzd integer not null check (nightly_subtotal_dzd >= 0),
  cleaning_fee_dzd     integer not null default 0,
  extra_guest_fee_dzd  integer not null default 0,
  discount_dzd         integer not null default 0,
  service_fee_dzd      integer not null default 0,   -- guest-side platform fee, non-refundable
  total_dzd            integer not null check (total_dzd >= 0),
  commission_bps       int not null,                 -- snapshot at booking
  commission_amount_dzd integer not null default 0,
  host_payout_dzd      integer not null default 0,
  cancellation_tier    cancellation_tier not null references public.cancellation_policies(tier),
  payment_deadline     timestamptz,
  cancelled_by         uuid references public.profiles(id),
  cancellation_reason  text,
  cancelled_at         timestamptz,
  refund_amount_dzd    integer not null default 0,
  confirmed_at         timestamptz,
  checked_in_at        timestamptz,
  completed_at         timestamptz,
  special_requests     text,
  -- Denormalized from room_types.inventory_count (set by trigger). Powers the
  -- single-unit no-overlap exclusion constraint below WITHOUT a subquery predicate
  -- (Postgres forbids subqueries in exclusion/index predicates). Implements the §5 intent.
  is_single_unit       boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (check_out > check_in)
);
-- Host reservations dashboard (by property, by host).
create index bookings_host_profile_id_idx on public.bookings(host_profile_id, status);
create index bookings_property_id_idx on public.bookings(property_id, status);
create index bookings_guest_id_idx on public.bookings(guest_id, status);
create index bookings_room_type_id_idx on public.bookings(room_type_id);
-- Overlap / availability re-check by room type over a date range.
create index bookings_stay_range_gix on public.bookings using gist (room_type_id, stay_range);
create index bookings_status_idx on public.bookings(status);

-- Single-unit integrity backstop (§5): no overlapping live bookings when the room
-- type has inventory_count=1. The §5 spec writes this with a subquery predicate, but
-- Postgres forbids subqueries in exclusion-constraint predicates; we use the
-- denormalized is_single_unit flag (maintained by trg_bookings_set_single_unit) to
-- achieve the identical guard. Multi-unit hotels rely on the advisory-lock +
-- effective-availability re-check in create_booking (legitimate cross-unit overlaps allowed).
alter table public.bookings
  add constraint bookings_single_unit_no_overlap
  exclude using gist (room_type_id with =, stay_range with &&)
  where (is_single_unit
         and status in ('awaiting_payment','confirmed','checked_in'));

-- inventory_holds references bookings (created after bookings exists).
create table public.inventory_holds (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings(id) on delete cascade,
  room_type_id uuid not null references public.room_types(id),
  date_from    date not null,
  date_to      date not null,               -- '[)' semantics
  units        smallint not null default 1 check (units > 0),
  status       hold_status not null default 'held',
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  check (date_to > date_from)
);
-- Active-hold lookup for effective-availability computation (§5).
create index inventory_holds_active_idx
  on public.inventory_holds(room_type_id, date_from, date_to)
  where status = 'held';
create index inventory_holds_booking_id_idx on public.inventory_holds(booking_id);
create index inventory_holds_expiry_idx
  on public.inventory_holds(expires_at) where status = 'held';

-- ===========================================================================
-- 4.7 Payments & payouts
-- ===========================================================================

create table public.transactions (
  id                      uuid primary key default gen_random_uuid(),
  booking_id              uuid references public.bookings(id) on delete set null,
  kind                    transaction_kind not null default 'payment',
  method                  payment_method not null,
  provider                payment_provider not null,
  status                  transaction_status not null default 'pending',
  amount_dzd              integer not null check (amount_dzd >= 0),   -- gross
  commission_bps          int not null,
  commission_amount_dzd   integer not null default 0,
  gateway_fee_dzd         integer not null default 0,
  host_payout_dzd         integer not null default 0,
  refunded_dzd            integer not null default 0,
  currency                char(3) not null default 'DZD' check (currency = 'DZD'),
  provider_ref            text,                       -- Chargily checkout id
  provider_status         text,
  provider_payment_method text,
  checkout_url            text,
  success_url             text,
  failure_url             text,
  expires_at              timestamptz,
  paid_at                 timestamptz,
  idempotency_key         text unique,
  raw_payload             jsonb not null default '{}',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create unique index transactions_provider_ref_uidx
  on public.transactions(provider, provider_ref) where provider_ref is not null;
create index transactions_booking_id_idx on public.transactions(booking_id);
create index transactions_status_expiry_idx
  on public.transactions(status, expires_at) where status = 'pending';

create table public.webhook_events (
  id                uuid primary key default gen_random_uuid(),
  provider          payment_provider not null,
  provider_event_id text not null,
  event_type        text not null,                  -- checkout.paid/failed/canceled
  provider_ref      text,
  signature         text,
  signature_ok      boolean not null,
  payload           jsonb not null,
  transaction_id    uuid references public.transactions(id),
  processed_at      timestamptz,
  process_result    text check (process_result in ('applied','duplicate','stale','ignored')),
  received_at       timestamptz not null default now(),
  unique (provider, provider_event_id)
);
create index webhook_events_provider_ref_idx on public.webhook_events(provider, provider_ref);

create table public.payouts (
  id                    uuid primary key default gen_random_uuid(),
  host_profile_id       uuid not null references public.host_profiles(id),
  status                payout_status not null default 'pending',
  gross_dzd             integer not null,
  commission_amount_dzd integer not null,
  net_dzd               integer not null,
  currency              char(3) not null default 'DZD' check (currency = 'DZD'),
  method                text check (method in ('ccp','bank')),
  destination_rib       text,
  period_start          date not null,
  period_end            date not null,
  reference             text,
  statement_path        text,                        -- PDF in payout-statements bucket
  paid_at               timestamptz,
  failure_reason        text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index payouts_host_profile_id_idx on public.payouts(host_profile_id, status);

create table public.payout_items (
  payout_id  uuid references public.payouts(id) on delete cascade,
  booking_id uuid references public.bookings(id),
  net_dzd    integer not null,
  primary key (payout_id, booking_id)
);

-- ===========================================================================
-- 4.8 Reviews & replies
-- ===========================================================================

create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null unique references public.bookings(id) on delete cascade,
  property_id   uuid not null references public.properties(id) on delete cascade,
  author_id     uuid not null references public.profiles(id),
  target        text not null check (target in ('property','guest')),
  status        review_status not null default 'pending',
  overall       smallint not null check (overall between 1 and 5),
  cleanliness   smallint check (cleanliness between 1 and 5),
  accuracy      smallint check (accuracy between 1 and 5),
  communication smallint check (communication between 1 and 5),
  location      smallint check (location between 1 and 5),
  value         smallint check (value between 1 and 5),
  checkin       smallint check (checkin between 1 and 5),
  comment_text  text,
  published_at  timestamptz,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index reviews_property_id_idx on public.reviews(property_id) where deleted_at is null;
create index reviews_author_id_idx on public.reviews(author_id);
create index reviews_status_idx on public.reviews(status);

create table public.review_replies (
  id              uuid primary key default gen_random_uuid(),
  review_id       uuid not null unique references public.reviews(id) on delete cascade,
  host_profile_id uuid not null references public.host_profiles(id),
  author_id       uuid not null references public.profiles(id),
  body            text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ===========================================================================
-- 4.9 Messaging
-- ===========================================================================

create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  kind            conversation_kind not null,
  property_id     uuid references public.properties(id) on delete set null,
  booking_id      uuid references public.bookings(id) on delete set null,
  guest_id        uuid not null references public.profiles(id),
  host_profile_id uuid not null references public.host_profiles(id),
  last_message_at timestamptz,
  created_at      timestamptz not null default now()
);
create unique index conversations_one_per_booking
  on public.conversations(booking_id) where booking_id is not null;
create index conversations_guest_id_idx on public.conversations(guest_id);
create index conversations_host_profile_id_idx on public.conversations(host_profile_id);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id),
  body            text,
  attachment_path text,
  read_at         timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index messages_conversation_id_idx on public.messages(conversation_id, created_at);

-- ===========================================================================
-- 4.10 Favorites & wishlists
-- ===========================================================================

create table public.wishlists (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  name             text not null,
  is_default       boolean not null default false,
  cover_photo_path text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index wishlists_one_default_per_user
  on public.wishlists(user_id) where is_default;
create index wishlists_user_id_idx on public.wishlists(user_id);

create table public.wishlist_items (
  wishlist_id uuid references public.wishlists(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (wishlist_id, property_id)
);
create index wishlist_items_property_id_idx on public.wishlist_items(property_id);

-- ===========================================================================
-- 4.11 Merchandising
-- ===========================================================================

create table public.featured_collections (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  title_ar         text,
  title_fr         text,
  title_en         text,
  subtitle_ar      text,
  subtitle_fr      text,
  subtitle_en      text,
  cover_photo_path text,
  is_active        boolean not null default true,
  starts_at        timestamptz,
  ends_at          timestamptz,
  sort_order       smallint not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.collection_items (
  collection_id uuid references public.featured_collections(id) on delete cascade,
  property_id   uuid references public.properties(id) on delete cascade,
  sort_order    smallint not null default 0,
  primary key (collection_id, property_id)
);

create table public.promo_banners (
  id         uuid primary key default gen_random_uuid(),
  image_path text not null,
  title_ar   text,
  title_fr   text,
  title_en   text,
  body_ar    text,
  body_fr    text,
  body_en    text,
  target_url text,
  is_active  boolean not null default true,
  starts_at  timestamptz,
  ends_at    timestamptz,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.home_rails (
  id            uuid primary key default gen_random_uuid(),
  key           text unique not null,
  kind          rail_kind not null,
  title_ar      text,
  title_fr      text,
  title_en      text,
  wilaya_code   smallint references public.wilayas(code),
  collection_id uuid references public.featured_collections(id),
  is_active     boolean not null default true,
  sort_order    smallint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ===========================================================================
-- 4.12 Moderation, disputes & audit
-- ===========================================================================

create table public.disputes (
  id                uuid primary key default gen_random_uuid(),
  booking_id        uuid not null references public.bookings(id) on delete cascade,
  opened_by         uuid not null references public.profiles(id),
  against           uuid references public.profiles(id),
  category          dispute_category not null,
  status            dispute_status not null default 'open',
  description       text,
  resolution_note   text,
  resolved_by       uuid references public.profiles(id),
  resolved_at       timestamptz,
  refund_amount_dzd integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index disputes_booking_id_idx on public.disputes(booking_id);
create index disputes_opened_by_idx on public.disputes(opened_by);
create index disputes_status_idx on public.disputes(status);

create table public.dispute_messages (
  id            uuid primary key default gen_random_uuid(),
  dispute_id    uuid not null references public.disputes(id) on delete cascade,
  sender_id     uuid not null references public.profiles(id),
  body          text,
  evidence_path text,
  created_at    timestamptz not null default now()
);
create index dispute_messages_dispute_id_idx on public.dispute_messages(dispute_id);

create table public.notifications (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.profiles(id) on delete cascade,
  type      text not null check (type in (
              'booking_requested','booking_accepted','booking_declined','booking_confirmed',
              'booking_cancelled','booking_reminder','checkin_instructions',
              'payment_succeeded','payment_failed','payment_expired',
              'payout_paid','review_received','review_reply','message_received',
              'listing_submitted','listing_approved','listing_rejected',
              'listing_changes_requested','listing_suspended',
              'dispute_opened','dispute_resolved','staff_invited')),
  title_ar  text,
  title_fr  text,
  title_en  text,
  body_ar   text,
  body_fr   text,
  body_en   text,
  data      jsonb,
  read_at   timestamptz,
  sent_push boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_id_idx on public.notifications(user_id, created_at desc);
create index notifications_unread_idx on public.notifications(user_id) where read_at is null;

create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid not null references public.profiles(id),
  actor_role  app_role,
  action      text not null,
  target_type text not null,
  target_id   uuid,
  before      jsonb,
  after       jsonb,
  reason_code text,
  reason      text,
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index audit_log_target_idx on public.audit_log(target_type, target_id);
create index audit_log_actor_idx on public.audit_log(actor_id, created_at desc);

-- ===========================================================================
-- 4.13 Settings
-- ===========================================================================

create table public.platform_settings (
  id                    smallint primary key default 1 check (id = 1),
  commission_bps        int not null default 1000 check (commission_bps between 0 and 5000),
  payout_period         text not null default 'biweekly',
  payout_hold_hours     int not null default 24,
  request_expiry_hours  int not null default 24,
  payment_window_minutes int not null default 15,
  geo_fuzz_meters       int not null default 400,
  feature_flags         jsonb not null default '{}',
  updated_at            timestamptz not null default now()
);

-- ===========================================================================
-- Enable Row Level Security on every table (force + policies in rls migration).
-- ===========================================================================
alter table public.wilayas               enable row level security;
alter table public.communes              enable row level security;
alter table public.property_types        enable row level security;
alter table public.amenities             enable row level security;
alter table public.cancellation_policies enable row level security;
alter table public.profiles              enable row level security;
alter table public.user_roles            enable row level security;
alter table public.host_profiles         enable row level security;
alter table public.hotel_staff           enable row level security;
alter table public.properties            enable row level security;
alter table public.room_types            enable row level security;
alter table public.property_photos       enable row level security;
alter table public.property_amenities    enable row level security;
alter table public.room_amenities        enable row level security;
alter table public.availability          enable row level security;
alter table public.rate_plans            enable row level security;
alter table public.bookings              enable row level security;
alter table public.inventory_holds       enable row level security;
alter table public.transactions          enable row level security;
alter table public.webhook_events        enable row level security;
alter table public.payouts               enable row level security;
alter table public.payout_items          enable row level security;
alter table public.reviews               enable row level security;
alter table public.review_replies        enable row level security;
alter table public.conversations         enable row level security;
alter table public.messages              enable row level security;
alter table public.wishlists             enable row level security;
alter table public.wishlist_items        enable row level security;
alter table public.featured_collections  enable row level security;
alter table public.collection_items      enable row level security;
alter table public.promo_banners         enable row level security;
alter table public.home_rails            enable row level security;
alter table public.disputes              enable row level security;
alter table public.dispute_messages      enable row level security;
alter table public.notifications         enable row level security;
alter table public.audit_log             enable row level security;
alter table public.platform_settings     enable row level security;
