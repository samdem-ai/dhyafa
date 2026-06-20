-- ===========================================================================
-- Ensure every wilaya has at least one commune (P9)
-- ---------------------------------------------------------------------------
-- The host listing-location picker and property detail need a commune for the
-- selected wilaya, but only 11 wilayas were seeded with communes. This adds the
-- chef-lieu (capital) commune — named after the wilaya, id = wilaya_code*100+1 —
-- for every wilaya not already covered.
--
-- Idempotent + safe in any order: `where not exists` skips wilayas that already
-- have communes, and `on conflict do nothing` guards the id. On a FRESH local
-- `db reset` the wilayas are loaded by seed.sql (which runs AFTER migrations), so
-- this inserts nothing there and seed.sql performs the same fill-in; on an
-- already-seeded database (e.g. the VPS) the wilayas exist, so this back-fills
-- the missing communes on `supabase db push`.
-- ===========================================================================

insert into public.communes (id, wilaya_code, name_ar, name_fr, name_en)
select w.code * 100 + 1, w.code, w.name_ar, w.name_fr, w.name_en
from public.wilayas w
where not exists (select 1 from public.communes c where c.wilaya_code = w.code)
on conflict (id) do nothing;
