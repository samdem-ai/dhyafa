-- ============================================================================
-- 20260531120500_views.sql
-- Dyafa (دافة) — Views & materialized views (§4.10/§4.13/§9).
-- properties_public (geo-masked), favorites (compat view), property_review_stats MV,
-- and the 5 analytics MVs. Unique indexes added so REFRESH ... CONCURRENTLY works.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- properties_public (§9): public read path. Omits exact geo/lat/lng/address_line.
-- Exposes geo_fuzzed + approximate lat/lng rounded to 3 decimals (~110m).
-- security_invoker = OFF (definer): the view runs as its owner so it can read the
-- exact lat/lng to compute the rounded approximation, while `anon`/`authenticated`
-- are denied direct column access on the base table (see geo COLUMN revoke in the RLS
-- migration). The view's own WHERE (approved + not deleted) is the public gate, and we
-- grant SELECT on the view to anon/authenticated. This is the canonical public browse path.
-- ---------------------------------------------------------------------------
create or replace view public.properties_public
with (security_invoker = off) as
select
  p.id,
  p.host_profile_id,
  p.property_type_id,
  p.listing_kind,
  p.title_ar, p.title_fr, p.title_en,
  p.description_ar, p.description_fr, p.description_en,
  p.status,
  p.wilaya_code,
  p.commune_id,
  -- exact address_line / lat / lng / geo intentionally omitted
  round(p.lat, 3) as approx_lat,
  round(p.lng, 3) as approx_lng,
  p.geo_fuzzed,
  p.cancellation_tier,
  p.checkin_time, p.checkout_time,
  p.house_rules_ar, p.house_rules_fr, p.house_rules_en,
  p.instant_book,
  p.currency,
  p.min_nights, p.max_nights,
  p.cover_photo_path,
  p.rating_avg, p.review_count,
  p.published_at,
  p.created_at, p.updated_at
from public.properties p
where p.status = 'approved' and p.deleted_at is null;

grant select on public.properties_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- favorites (§4.10): compatibility view over wishlist_items for the default list.
-- security_invoker=on → wishlists/wishlist_items RLS (per-user) applies.
-- ---------------------------------------------------------------------------
create or replace view public.favorites
with (security_invoker = on) as
select w.user_id, wi.property_id, wi.added_at
from public.wishlist_items wi
join public.wishlists w on w.id = wi.wishlist_id
where w.is_default;

grant select on public.favorites to authenticated;

-- ===========================================================================
-- property_review_stats (MV): 6 category averages + computed_overall + review_count.
-- Feeds the property detail page.
-- ===========================================================================
create materialized view public.property_review_stats as
select
  r.property_id,
  count(*)                                   as review_count,
  round(avg(r.overall)::numeric, 2)          as avg_overall,
  round(avg(r.cleanliness)::numeric, 2)      as avg_cleanliness,
  round(avg(r.accuracy)::numeric, 2)         as avg_accuracy,
  round(avg(r.communication)::numeric, 2)    as avg_communication,
  round(avg(r.location)::numeric, 2)         as avg_location,
  round(avg(r.value)::numeric, 2)            as avg_value,
  round(avg(r.checkin)::numeric, 2)          as avg_checkin,
  round(avg(
    ( coalesce(r.cleanliness, r.overall)
    + coalesce(r.accuracy, r.overall)
    + coalesce(r.communication, r.overall)
    + coalesce(r.location, r.overall)
    + coalesce(r.value, r.overall)
    + coalesce(r.checkin, r.overall) ) / 6.0
  )::numeric, 2)                             as computed_overall
from public.reviews r
where r.status = 'published' and r.deleted_at is null
group by r.property_id;

create unique index property_review_stats_pk on public.property_review_stats(property_id);

-- ===========================================================================
-- mv_daily_metrics — per day: bookings, gmv, commission, new users, completed.
-- ===========================================================================
create materialized view public.mv_daily_metrics as
with days as (
  select d::date as day
  from generate_series(
         coalesce((select min(created_at)::date from public.bookings), current_date),
         current_date, interval '1 day') d
),
b as (
  select created_at::date as day,
         count(*)                                   as bookings_count,
         coalesce(sum(total_dzd) filter (where status in ('confirmed','checked_in','completed')), 0) as gmv_dzd,
         coalesce(sum(commission_amount_dzd) filter (where status in ('confirmed','checked_in','completed')), 0) as commission_dzd,
         count(*) filter (where status = 'completed') as completed_bookings
  from public.bookings
  group by created_at::date
),
u as (
  select created_at::date as day, count(*) as new_users
  from public.profiles
  group by created_at::date
)
select
  days.day,
  coalesce(b.bookings_count, 0)     as bookings_count,
  coalesce(b.gmv_dzd, 0)            as gmv_dzd,
  coalesce(b.commission_dzd, 0)     as commission_dzd,
  coalesce(u.new_users, 0)          as new_users,
  coalesce(b.completed_bookings, 0) as completed_bookings
from days
left join b on b.day = days.day
left join u on u.day = days.day;

create unique index mv_daily_metrics_pk on public.mv_daily_metrics(day);

-- ===========================================================================
-- mv_conversion_funnel — per day: listing_views, booking_starts, bookings_paid, conversion_pct.
-- listing_views has no source table in v1 (client analytics deferred) → 0 placeholder.
-- booking_starts = bookings created; bookings_paid = bookings reaching paid/confirmed.
-- ===========================================================================
create materialized view public.mv_conversion_funnel as
with days as (
  select d::date as day
  from generate_series(
         coalesce((select min(created_at)::date from public.bookings), current_date),
         current_date, interval '1 day') d
),
starts as (
  select created_at::date as day, count(*) as booking_starts
  from public.bookings group by created_at::date
),
paid as (
  select b.created_at::date as day, count(*) as bookings_paid
  from public.bookings b
  where b.status in ('confirmed','checked_in','completed')
  group by b.created_at::date
)
select
  days.day,
  0::bigint                              as listing_views,   -- placeholder (v1: no view tracking)
  coalesce(starts.booking_starts, 0)     as booking_starts,
  coalesce(paid.bookings_paid, 0)        as bookings_paid,
  case when coalesce(starts.booking_starts, 0) = 0 then 0
       else round(100.0 * coalesce(paid.bookings_paid, 0) / starts.booking_starts, 2)
  end                                    as conversion_pct
from days
left join starts on starts.day = days.day
left join paid   on paid.day   = days.day;

create unique index mv_conversion_funnel_pk on public.mv_conversion_funnel(day);

-- ===========================================================================
-- mv_top_destinations — per wilaya/commune, rolling 30d & 90d windows.
-- ===========================================================================
create materialized view public.mv_top_destinations as
select
  p.wilaya_code,
  p.commune_id,
  w.window,
  count(*)                       as bookings,
  coalesce(sum(b.total_dzd), 0)  as gmv_dzd
from public.bookings b
join public.properties p on p.id = b.property_id
cross join lateral (values (30), (90)) as w(window)
where b.status in ('confirmed','checked_in','completed')
  and b.created_at >= (current_date - (w.window || ' days')::interval)
group by p.wilaya_code, p.commune_id, w.window;

-- Unique index for CONCURRENTLY. commune_id may be null → coalesce to a sentinel in the index.
create unique index mv_top_destinations_pk
  on public.mv_top_destinations(window, wilaya_code, coalesce(commune_id, -1));

-- ===========================================================================
-- mv_host_performance — per host: active listings, bookings, gmv, avg rating,
-- cancellation rate, response rate.
-- ===========================================================================
create materialized view public.mv_host_performance as
with hb as (
  select host_profile_id,
         count(*)                                                  as bookings,
         coalesce(sum(total_dzd) filter (where status in ('confirmed','checked_in','completed')), 0) as gmv_dzd,
         count(*) filter (where status = 'cancelled')              as cancelled_count
  from public.bookings
  group by host_profile_id
),
hl as (
  select host_profile_id,
         count(*) filter (where status = 'approved' and deleted_at is null) as listings_active,
         round(avg(rating_avg) filter (where review_count > 0)::numeric, 2)  as avg_rating
  from public.properties
  group by host_profile_id
),
hr as (
  -- response rate: share of booking-conversations with at least one host reply.
  select c.host_profile_id,
         count(*) filter (where exists (
           select 1 from public.messages m
           where m.conversation_id = c.id
             and m.sender_id <> c.guest_id
         ))::numeric                                               as responded,
         count(*)::numeric                                         as total_convos
  from public.conversations c
  group by c.host_profile_id
)
select
  hp.id                                   as host_profile_id,
  coalesce(hl.listings_active, 0)         as listings_active,
  coalesce(hb.bookings, 0)                as bookings,
  coalesce(hb.gmv_dzd, 0)                 as gmv_dzd,
  coalesce(hl.avg_rating, 0)             as avg_rating,
  case when coalesce(hb.bookings, 0) = 0 then 0
       else round(100.0 * hb.cancelled_count / hb.bookings, 2) end as cancellation_rate,
  case when coalesce(hr.total_convos, 0) = 0 then 0
       else round(100.0 * hr.responded / hr.total_convos, 2) end   as response_rate
from public.host_profiles hp
left join hb on hb.host_profile_id = hp.id
left join hl on hl.host_profile_id = hp.id
left join hr on hr.host_profile_id = hp.id;

create unique index mv_host_performance_pk on public.mv_host_performance(host_profile_id);

-- ===========================================================================
-- mv_revenue_by_period — day / week / month grain: gmv, commission, host net.
-- ===========================================================================
create materialized view public.mv_revenue_by_period as
select
  g.period,
  date_trunc(g.period, b.created_at)::date          as period_start,
  coalesce(sum(b.total_dzd), 0)                     as gmv_dzd,
  coalesce(sum(b.commission_amount_dzd), 0)         as commission_dzd,
  coalesce(sum(b.host_payout_dzd), 0)               as host_net_dzd
from public.bookings b
cross join lateral (values ('day'), ('week'), ('month')) as g(period)
where b.status in ('confirmed','checked_in','completed')
group by g.period, date_trunc(g.period, b.created_at)::date;

create unique index mv_revenue_by_period_pk
  on public.mv_revenue_by_period(period, period_start);

-- ===========================================================================
-- analytics_refresh helper — REFRESH ... CONCURRENTLY for all MVs (§10).
-- Called by pg_cron / analytics-refresh Edge Function (service role).
-- ===========================================================================
create or replace function public.refresh_analytics()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  refresh materialized view concurrently public.property_review_stats;
  refresh materialized view concurrently public.mv_daily_metrics;
  refresh materialized view concurrently public.mv_conversion_funnel;
  refresh materialized view concurrently public.mv_top_destinations;
  refresh materialized view concurrently public.mv_host_performance;
  refresh materialized view concurrently public.mv_revenue_by_period;
end;
$$;

grant execute on function public.refresh_analytics() to service_role;
