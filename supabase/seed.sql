-- ============================================================================
-- seed.sql — Dyafa (دافة) reference + demo seed. Idempotent (on conflict).
-- Run automatically by `supabase db reset`.
-- Source of truth: docs/10-canonical-spec.md (§8 wilaya seed; §6 cancellation tiers).
--
-- Wilayas: ALL 69 (Algeria expanded to 69 on 16 Nov 2025).
--   Codes 1-58: the classic 48 + 10 promoted 2019 delegated wilayas.
--   Codes 59-69: the 11 created 16 Nov 2025.
--   Authoritative code->name mapping cross-verified: Wikipedia "Provinces of Algeria"
--   + Algerie-Eco "Les numéros des 11 nouvelles wilayas" (FLN deputy official disclosure).
--   Coordinates from S450R1/algeria-cities-2025 lineage (Mohamed-gp/algeria_69_wilayas),
--   matched by name. Western Arabic numerals throughout.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- platform_settings (single row, id=1) — §4.13
-- ---------------------------------------------------------------------------
insert into public.platform_settings (id, commission_bps, payout_period, payout_hold_hours,
                                      request_expiry_hours, payment_window_minutes, geo_fuzz_meters)
values (1, 1000, 'biweekly', 24, 24, 15, 400)
on conflict (id) do update
  set commission_bps = excluded.commission_bps,
      request_expiry_hours = excluded.request_expiry_hours,
      payment_window_minutes = excluded.payment_window_minutes,
      geo_fuzz_meters = excluded.geo_fuzz_meters;

-- ---------------------------------------------------------------------------
-- wilayas — ALL 69
-- ---------------------------------------------------------------------------
insert into public.wilayas (code, name_ar, name_fr, name_en, lat, lng, is_active) values
  (1,  'أدرار',          'Adrar',                 'Adrar',                 27.971600, -0.187000, true),
  (2,  'الشلف',          'Chlef',                 'Chlef',                 36.164600,  1.334700, true),
  (3,  'الأغواط',        'Laghouat',              'Laghouat',              33.800000,  2.883300, true),
  (4,  'أم البواقي',     'Oum El Bouaghi',        'Oum El Bouaghi',        35.875300,  7.113300, true),
  (5,  'باتنة',          'Batna',                 'Batna',                 35.555800,  6.174200, true),
  (6,  'بجاية',          'Béjaïa',                'Bejaia',                36.752500,  5.055300, true),
  (7,  'بسكرة',          'Biskra',                'Biskra',                34.850300,  5.724200, true),
  (8,  'بشار',           'Béchar',                'Bechar',                31.616700, -2.216700, true),
  (9,  'البليدة',        'Blida',                 'Blida',                 36.480000,  2.828300, true),
  (10, 'البويرة',        'Bouira',                'Bouira',                36.368900,  3.900000, true),
  (11, 'تمنراست',        'Tamanrasset',           'Tamanrasset',           22.785000,  5.522800, true),
  (12, 'تبسة',           'Tébessa',               'Tebessa',               35.404200,  8.124200, true),
  (13, 'تلمسان',         'Tlemcen',               'Tlemcen',               34.878100, -1.315000, true),
  (14, 'تيارت',          'Tiaret',                'Tiaret',                35.371100,  1.322500, true),
  (15, 'تيزي وزو',       'Tizi Ouzou',            'Tizi Ouzou',            36.701900,  4.050000, true),
  (16, 'الجزائر',        'Alger',                 'Algiers',               36.753800,  3.058800, true),
  (17, 'الجلفة',         'Djelfa',                'Djelfa',                34.670300,  3.250000, true),
  (18, 'جيجل',           'Jijel',                 'Jijel',                 36.820000,  5.766700, true),
  (19, 'سطيف',           'Sétif',                 'Setif',                 36.183300,  5.400000, true),
  (20, 'سعيدة',          'Saïda',                 'Saida',                 34.833300,  0.150000, true),
  (21, 'سكيكدة',         'Skikda',                'Skikda',                36.866700,  6.916700, true),
  (22, 'سيدي بلعباس',    'Sidi Bel Abbès',        'Sidi Bel Abbes',        35.190000, -0.640000, true),
  (23, 'عنابة',          'Annaba',                'Annaba',                36.900000,  7.766700, true),
  (24, 'قالمة',          'Guelma',                'Guelma',                36.463300,  7.433100, true),
  (25, 'قسنطينة',        'Constantine',           'Constantine',           36.365000,  6.614700, true),
  (26, 'المدية',         'Médéa',                 'Medea',                 36.264200,  2.753900, true),
  (27, 'مستغانم',        'Mostaganem',            'Mostaganem',            35.930600,  0.089200, true),
  (28, 'المسيلة',        'M''Sila',               'M''Sila',               35.705800,  4.542500, true),
  (29, 'معسكر',          'Mascara',               'Mascara',               35.383300,  0.150000, true),
  (30, 'ورقلة',          'Ouargla',               'Ouargla',               31.950000,  5.333300, true),
  (31, 'وهران',          'Oran',                  'Oran',                  35.696900, -0.633100, true),
  (32, 'البيض',          'El Bayadh',             'El Bayadh',             33.683300,  1.016700, true),
  (33, 'إليزي',          'Illizi',                'Illizi',                26.500000,  8.466700, true),
  (34, 'برج بوعريريج',   'Bordj Bou Arréridj',    'Bordj Bou Arreridj',    36.068600,  4.767800, true),
  (35, 'بومرداس',        'Boumerdès',             'Boumerdes',             36.760600,  3.472200, true),
  (36, 'الطارف',         'El Tarf',               'El Tarf',               36.766700,  8.300000, true),
  (37, 'تندوف',          'Tindouf',               'Tindouf',               27.800000, -8.133300, true),
  (38, 'تيسمسيلت',       'Tissemsilt',            'Tissemsilt',            35.605000,  1.810600, true),
  (39, 'الوادي',         'El Oued',               'El Oued',               33.366700,  6.866700, true),
  (40, 'خنشلة',          'Khenchela',             'Khenchela',             35.436100,  7.142800, true),
  (41, 'سوق أهراس',      'Souk Ahras',            'Souk Ahras',            36.283300,  7.950000, true),
  (42, 'تيبازة',         'Tipaza',                'Tipaza',                36.550000,  2.450000, true),
  (43, 'ميلة',           'Mila',                  'Mila',                  36.450300,  6.264200, true),
  (44, 'عين الدفلى',     'Aïn Defla',             'Ain Defla',             36.263900,  1.968100, true),
  (45, 'النعامة',        'Naâma',                 'Naama',                 33.266700, -0.316700, true),
  (46, 'عين تموشنت',     'Aïn Témouchent',        'Ain Temouchent',        35.298900, -1.139700, true),
  (47, 'غرداية',         'Ghardaïa',              'Ghardaia',              32.490600,  3.673900, true),
  (48, 'غليزان',         'Relizane',              'Relizane',              35.737200,  0.555800, true),
  (49, 'تيميمون',        'Timimoun',              'Timimoun',              29.266700,  0.233300, true),
  (50, 'برج باجي مختار', 'Bordj Badji Mokhtar',   'Bordj Badji Mokhtar',   21.327200,  0.954200, true),
  (51, 'أولاد جلال',     'Ouled Djellal',         'Ouled Djellal',         34.413900,  4.968600, true),
  (52, 'بني عباس',       'Béni Abbès',            'Beni Abbes',            30.133300, -2.166700, true),
  (53, 'عين صالح',       'In Salah',              'In Salah',              27.200000,  2.466700, true),
  (54, 'عين قزام',       'In Guezzam',            'In Guezzam',            19.566700,  5.766700, true),
  (55, 'تقرت',           'Touggourt',             'Touggourt',             33.106700,  6.058900, true),
  (56, 'جانت',           'Djanet',                'Djanet',                24.554200,  9.484400, true),
  (57, 'المغير',         'El M''Ghair',           'El Mghair',             33.966700,  5.916700, true),
  (58, 'المنيعة',        'El Menia',              'El Menia',              30.583300,  2.866700, true),
  -- 11 new wilayas created 16 Nov 2025 (codes 59-69; mapping per Algerie-Eco + Wikipedia)
  (59, 'أفلو',           'Aflou',                 'Aflou',                 34.112500,  2.100000, true),
  (60, 'الأبيض سيدي الشيخ','El Abiodh Sidi Cheikh','El Abiodh Sidi Cheikh', 32.893100,  0.548600, true),
  (61, 'العريشة',        'El Aricha',             'El Aricha',             31.916700, -1.116700, true),
  (62, 'القنطرة',        'El Kantara',            'El Kantara',            35.183300,  5.700000, true),
  (63, 'بريكة',          'Barika',                'Barika',                35.383300,  5.366700, true),
  (64, 'بوسعادة',        'Bou Saâda',             'Bou Saada',             35.219400,  4.186100, true),
  (65, 'بئر العاتر',     'Bir El Ater',           'Bir El Ater',           34.745000,  8.059700, true),
  (66, 'قصر البخاري',    'Ksar El Boukhari',      'Ksar El Boukhari',      35.888900,  2.749200, true),
  (67, 'قصر الشلالة',    'Ksar Chellala',         'Ksar Chellala',         35.211900,  2.315800, true),
  (68, 'عين وسارة',      'Aïn Oussara',           'Ain Oussera',           35.451900,  2.906900, true),
  (69, 'مسعد',           'Messaad',               'Messaad',               34.154400,  3.503600, true)
on conflict (code) do update
  set name_ar = excluded.name_ar, name_fr = excluded.name_fr, name_en = excluded.name_en,
      lat = excluded.lat, lng = excluded.lng;

-- ---------------------------------------------------------------------------
-- communes — a handful for popular wilayas. Stable integer ids (seed range 1000+).
-- (Alger, Oran, Tipaza, Béjaïa, Constantine, Ghardaïa, Djanet, Tamanrasset,
--  Annaba, Tlemcen, Jijel)
-- ---------------------------------------------------------------------------
insert into public.communes (id, wilaya_code, name_ar, name_fr, name_en, post_code) values
  -- Alger (16)
  (1601, 16, 'القصبة',          'Casbah',            'Casbah',            '16000'),
  (1602, 16, 'حيدرة',           'Hydra',             'Hydra',             '16035'),
  (1603, 16, 'باب الوادي',      'Bab El Oued',       'Bab El Oued',       '16002'),
  (1604, 16, 'سيدي امحمد',      'Sidi M''Hamed',     'Sidi M''Hamed',     '16001'),
  -- Oran (31)
  (3101, 31, 'وهران',           'Oran',              'Oran',              '31000'),
  (3102, 31, 'السانية',         'Es Sénia',          'Es Senia',          '31100'),
  (3103, 31, 'بئر الجير',       'Bir El Djir',       'Bir El Djir',       '31130'),
  -- Tipaza (42)
  (4201, 42, 'تيبازة',          'Tipaza',            'Tipaza',            '42000'),
  (4202, 42, 'شرشال',           'Cherchell',         'Cherchell',         '42100'),
  -- Béjaïa (6)
  (601,  6,  'بجاية',           'Béjaïa',            'Bejaia',            '06000'),
  (602,  6,  'أقبو',            'Akbou',             'Akbou',             '06200'),
  (603,  6,  'أوقاس',           'Aokas',             'Aokas',             '06004'),
  -- Constantine (25)
  (2501, 25, 'قسنطينة',         'Constantine',       'Constantine',       '25000'),
  (2502, 25, 'الخروب',          'El Khroub',         'El Khroub',         '25100'),
  -- Ghardaïa (47)
  (4701, 47, 'غرداية',          'Ghardaïa',          'Ghardaia',          '47000'),
  (4702, 47, 'بني يزقن',        'Beni Isguen',       'Beni Isguen',       '47010'),
  -- Djanet (56)
  (5601, 56, 'جانت',            'Djanet',            'Djanet',            '56000'),
  -- Tamanrasset (11)
  (1101, 11, 'تمنراست',         'Tamanrasset',       'Tamanrasset',       '11000'),
  (1102, 11, 'أبلسة',           'Abalessa',          'Abalessa',          '11020'),
  -- Annaba (23)
  (2301, 23, 'عنابة',           'Annaba',            'Annaba',            '23000'),
  (2302, 23, 'سرايدي',          'Seraïdi',           'Seraidi',           '23004'),
  -- Tlemcen (13)
  (1301, 13, 'تلمسان',          'Tlemcen',           'Tlemcen',           '13000'),
  (1302, 13, 'المنصورة',        'Mansourah',         'Mansourah',         '13002'),
  -- Jijel (18)
  (1801, 18, 'جيجل',            'Jijel',             'Jijel',             '18000'),
  (1802, 18, 'زيامة منصورية',   'Ziama Mansouriah',  'Ziama Mansouriah',  '18230')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- property_types — §4.3 canonical slugs
-- ---------------------------------------------------------------------------
insert into public.property_types (id, slug, name_ar, name_fr, name_en, kind, sort_order) values
  (1, 'apartment',   'شقة',           'Appartement',    'Apartment',   'single_unit', 1),
  (2, 'villa',       'فيلا',          'Villa',          'Villa',       'single_unit', 2),
  (3, 'riad',        'رياض',          'Riad',           'Riad',        'single_unit', 3),
  (4, 'studio',      'استوديو',       'Studio',         'Studio',      'single_unit', 4),
  (5, 'hotel',       'فندق',          'Hôtel',          'Hotel',       'multi_room',  5),
  (6, 'guesthouse',  'دار ضيافة',     'Maison d''hôtes','Guesthouse',  'single_unit', 6),
  (7, 'chalet',      'شاليه',         'Chalet',         'Chalet',      'single_unit', 7),
  (8, 'bungalow',    'بنغالو',        'Bungalow',       'Bungalow',    'single_unit', 8),
  (9, 'desert_camp', 'مخيم صحراوي',   'Campement',      'Desert Camp', 'single_unit', 9),
  (10,'hostel',      'نزل',           'Auberge',        'Hostel',      'multi_room',  10)
on conflict (id) do update
  set slug = excluded.slug, name_ar = excluded.name_ar, name_fr = excluded.name_fr,
      name_en = excluded.name_en, kind = excluded.kind, sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- amenities — categorized (general/kitchen/bathroom/safety/accessibility/outdoor)
-- ---------------------------------------------------------------------------
insert into public.amenities (id, slug, category, name_ar, name_fr, name_en) values
  (1,  'wifi',              'general',       'واي فاي',           'Wi-Fi',                  'Wi-Fi'),
  (2,  'air_conditioning',  'general',       'تكييف',             'Climatisation',          'Air conditioning'),
  (3,  'heating',           'general',       'تدفئة',             'Chauffage',              'Heating'),
  (4,  'tv',               'general',       'تلفزيون',           'Télévision',             'TV'),
  (5,  'workspace',         'general',       'مكتب عمل',          'Espace de travail',      'Workspace'),
  (6,  'parking',           'outdoor',       'موقف سيارات',       'Parking',                'Free parking'),
  (7,  'pool',              'outdoor',       'مسبح',              'Piscine',                'Pool'),
  (8,  'terrace',           'outdoor',       'تراس',              'Terrasse',               'Terrace'),
  (9,  'garden',            'outdoor',       'حديقة',             'Jardin',                 'Garden'),
  (10, 'sea_view',          'outdoor',       'إطلالة على البحر',  'Vue sur mer',            'Sea view'),
  (11, 'bbq',               'outdoor',       'شواء',              'Barbecue',               'BBQ'),
  (12, 'kitchen',           'kitchen',       'مطبخ',              'Cuisine équipée',        'Kitchen'),
  (13, 'fridge',            'kitchen',       'ثلاجة',             'Réfrigérateur',          'Refrigerator'),
  (14, 'microwave',         'kitchen',       'ميكروويف',          'Micro-ondes',            'Microwave'),
  (15, 'coffee_maker',      'kitchen',       'آلة قهوة',          'Cafetière',              'Coffee maker'),
  (16, 'dishwasher',        'kitchen',       'غسالة صحون',        'Lave-vaisselle',         'Dishwasher'),
  (17, 'washer',            'bathroom',      'غسالة',             'Lave-linge',             'Washing machine'),
  (18, 'hot_water',         'bathroom',      'ماء ساخن',          'Eau chaude',             'Hot water'),
  (19, 'hammam',            'bathroom',      'حمام',              'Hammam',                 'Hammam'),
  (20, 'hair_dryer',        'bathroom',      'مجفف شعر',          'Sèche-cheveux',          'Hair dryer'),
  (21, 'toiletries',        'bathroom',      'مستلزمات الحمام',   'Articles de toilette',   'Toiletries'),
  (22, 'smoke_alarm',       'safety',        'كاشف دخان',         'Détecteur de fumée',     'Smoke alarm'),
  (23, 'first_aid',         'safety',        'إسعافات أولية',     'Trousse de secours',     'First aid kit'),
  (24, 'fire_extinguisher', 'safety',        'طفاية حريق',        'Extincteur',             'Fire extinguisher'),
  (25, 'security_cameras',  'safety',        'كاميرات مراقبة',    'Caméras de surveillance','Security cameras'),
  (26, 'generator',         'safety',        'مولد كهربائي',      'Groupe électrogène',     'Backup generator'),
  (27, 'step_free_access',  'accessibility', 'مدخل بدون درج',     'Accès sans marches',     'Step-free access'),
  (28, 'wheelchair',        'accessibility', 'وصول لذوي الاحتياجات','Accès PMR',            'Wheelchair accessible'),
  (29, 'elevator',          'accessibility', 'مصعد',              'Ascenseur',              'Elevator'),
  (30, 'breakfast',         'general',       'فطور',              'Petit-déjeuner',         'Breakfast'),
  (31, 'airport_shuttle',   'general',       'نقل المطار',        'Navette aéroport',       'Airport shuttle'),
  (32, 'pets_allowed',      'general',       'حيوانات مسموح بها', 'Animaux acceptés',       'Pets allowed')
on conflict (id) do update
  set slug = excluded.slug, category = excluded.category, name_ar = excluded.name_ar,
      name_fr = excluded.name_fr, name_en = excluded.name_en;

-- ---------------------------------------------------------------------------
-- cancellation_policies — §6 thresholds. Service fee non-refundable in all tiers.
-- flexible: 100% until 24h before; moderate: 50% until 120h (5 days) before;
-- strict: 0% (full window set very large).
-- ---------------------------------------------------------------------------
insert into public.cancellation_policies
  (tier, refund_full_until_hours, refund_partial_pct, partial_until_hours, service_fee_refundable,
   name_ar, name_fr, name_en, description_ar, description_fr, description_en) values
  ('flexible', 24, 0, null, false,
   'مرنة', 'Flexible', 'Flexible',
   'استرداد كامل حتى 24 ساعة قبل الوصول.',
   'Remboursement intégral jusqu''à 24 h avant l''arrivée.',
   'Full refund up to 24 hours before check-in.'),
  ('moderate', 120, 50, 120, false,
   'معتدلة', 'Modérée', 'Moderate',
   'استرداد كامل حتى 5 أيام قبل الوصول، ثم 50%.',
   'Remboursement intégral jusqu''à 5 jours avant, puis 50 %.',
   'Full refund up to 5 days before check-in, then 50%.'),
  ('strict', 8760, 0, null, false,
   'صارمة', 'Stricte', 'Strict',
   'غير قابلة للاسترداد.',
   'Non remboursable.',
   'Non-refundable.')
on conflict (tier) do update
  set refund_full_until_hours = excluded.refund_full_until_hours,
      refund_partial_pct = excluded.refund_partial_pct,
      partial_until_hours = excluded.partial_until_hours,
      service_fee_refundable = excluded.service_fee_refundable,
      name_ar = excluded.name_ar, name_fr = excluded.name_fr, name_en = excluded.name_en,
      description_ar = excluded.description_ar, description_fr = excluded.description_fr,
      description_en = excluded.description_en;

-- ===========================================================================
-- DEMO USERS — LOCAL DEV ONLY. Do NOT run this block against a cloud project.
-- Inserts into auth.users with fixed UUIDs + a bcrypt password, then mirrors
-- profiles / user_roles / host_profiles. Password for every demo user: "password"
-- (bcrypt via extensions.crypt). Emails are confirmed inline.
--
-- Fixed UUIDs (namespaced d_yafa…):
--   guest             00000000-0000-4000-a000-000000000001
--   host_individual   00000000-0000-4000-a000-000000000002
--   host_hotel        00000000-0000-4000-a000-000000000003
--   hotel_staff       00000000-0000-4000-a000-000000000004
--   admin             00000000-0000-4000-a000-000000000005
--   super_admin       00000000-0000-4000-a000-000000000006
-- ===========================================================================

-- auth.users. Requires pgcrypto crypt() (installed in schema migration).
-- Token columns are set to '' (empty string) not NULL — some GoTrue versions error
-- on NULL token columns when scanning rows during login.
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, created_at, updated_at,
   raw_app_meta_data, raw_user_meta_data, is_super_admin,
   confirmation_token, recovery_token, email_change, email_change_token_new)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000001',
   'authenticated', 'authenticated', 'guest@demo.dyafa.dz',
   extensions.crypt('password', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Yacine Guest"}', false,
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000002',
   'authenticated', 'authenticated', 'host.individual@demo.dyafa.dz',
   extensions.crypt('password', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Amina Host"}', false,
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000003',
   'authenticated', 'authenticated', 'host.hotel@demo.dyafa.dz',
   extensions.crypt('password', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Hôtel Atlas"}', false,
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000004',
   'authenticated', 'authenticated', 'staff.reception@demo.dyafa.dz',
   extensions.crypt('password', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Karim Reception"}', false,
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000005',
   'authenticated', 'authenticated', 'admin@demo.dyafa.dz',
   extensions.crypt('password', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Admin"}', false,
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000006',
   'authenticated', 'authenticated', 'super.admin@demo.dyafa.dz',
   extensions.crypt('password', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Super Admin"}', false,
   '', '', '', '')
on conflict (id) do nothing;

-- auth.identities (GoTrue expects an email identity per user for password login).
insert into auth.identities
  (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001',
   '00000000-0000-4000-a000-000000000001',
   '{"sub":"00000000-0000-4000-a000-000000000001","email":"guest@demo.dyafa.dz","email_verified":true}',
   'email', now(), now(), now()),
  ('00000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000002',
   '00000000-0000-4000-a000-000000000002',
   '{"sub":"00000000-0000-4000-a000-000000000002","email":"host.individual@demo.dyafa.dz","email_verified":true}',
   'email', now(), now(), now()),
  ('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000003',
   '00000000-0000-4000-a000-000000000003',
   '{"sub":"00000000-0000-4000-a000-000000000003","email":"host.hotel@demo.dyafa.dz","email_verified":true}',
   'email', now(), now(), now()),
  ('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000004',
   '00000000-0000-4000-a000-000000000004',
   '{"sub":"00000000-0000-4000-a000-000000000004","email":"staff.reception@demo.dyafa.dz","email_verified":true}',
   'email', now(), now(), now()),
  ('00000000-0000-4000-a000-000000000005', '00000000-0000-4000-a000-000000000005',
   '00000000-0000-4000-a000-000000000005',
   '{"sub":"00000000-0000-4000-a000-000000000005","email":"admin@demo.dyafa.dz","email_verified":true}',
   'email', now(), now(), now()),
  ('00000000-0000-4000-a000-000000000006', '00000000-0000-4000-a000-000000000006',
   '00000000-0000-4000-a000-000000000006',
   '{"sub":"00000000-0000-4000-a000-000000000006","email":"super.admin@demo.dyafa.dz","email_verified":true}',
   'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

-- profiles (1:1 mirror). display_name not null.
insert into public.profiles (id, full_name, display_name, phone_e164, preferred_locale, default_wilaya_code) values
  ('00000000-0000-4000-a000-000000000001', 'Yacine Benali',  'Yacine',         '+213550000001', 'ar', 16),
  ('00000000-0000-4000-a000-000000000002', 'Amina Cherif',   'Amina',          '+213550000002', 'fr', 42),
  ('00000000-0000-4000-a000-000000000003', 'Atlas Hôtels',   'Hôtel Atlas',    '+213550000003', 'fr', 16),
  ('00000000-0000-4000-a000-000000000004', 'Karim Saidi',    'Karim',          '+213550000004', 'ar', 16),
  ('00000000-0000-4000-a000-000000000005', 'Admin Dyafa',    'Admin',          '+213550000005', 'fr', 16),
  ('00000000-0000-4000-a000-000000000006', 'Super Admin',    'Super Admin',    '+213550000006', 'fr', 16)
on conflict (id) do nothing;

-- user_roles (additive). Guest also gets host_individual to prove dual-role.
insert into public.user_roles (user_id, role) values
  ('00000000-0000-4000-a000-000000000001', 'guest'),
  ('00000000-0000-4000-a000-000000000002', 'guest'),
  ('00000000-0000-4000-a000-000000000002', 'host_individual'),
  ('00000000-0000-4000-a000-000000000003', 'guest'),
  ('00000000-0000-4000-a000-000000000003', 'host_hotel'),
  ('00000000-0000-4000-a000-000000000004', 'hotel_staff'),
  ('00000000-0000-4000-a000-000000000005', 'admin'),
  ('00000000-0000-4000-a000-000000000006', 'super_admin')
on conflict (user_id, role) do nothing;

-- host_profiles for the two host accounts (fixed ids for downstream seeds).
--   individual host  10000000-0000-4000-b000-000000000001
--   hotel host       10000000-0000-4000-b000-000000000002
insert into public.host_profiles
  (id, owner_id, kind, legal_name, display_name, identity_status, payout_status, payout_method)
values
  ('10000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000002',
   'individual', 'Amina Cherif', 'Amina — Séjours Tipaza', 'verified', 'verified', 'ccp'),
  ('10000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000003',
   'hotel', 'SARL Atlas Hôtels', 'Hôtel Atlas Alger', 'verified', 'verified', 'bank')
on conflict (id) do nothing;

-- hotel_staff: reception user scoped to the hotel host_profile.
insert into public.hotel_staff (host_profile_id, user_id, staff_role, is_active, accepted_at) values
  ('10000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000004',
   'reception', true, now())
on conflict (host_profile_id, user_id) do nothing;

-- Default wishlist for the guest (heart toggle target).
insert into public.wishlists (id, user_id, name, is_default) values
  ('20000000-0000-4000-c000-000000000001', '00000000-0000-4000-a000-000000000001', 'Mes favoris', true)
on conflict (id) do nothing;

-- TODO(verify): commune coordinates/post codes are representative samples, not the
-- full 1541-commune dataset (S450R1/algeria-cities-2025) — expand if commune-level
-- search precision is needed. Wilaya set is complete (69/69) and code-verified.
