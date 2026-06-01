-- =====================================================================
-- Dyafa — DEMO LISTINGS seed (discovery/search content)
-- =====================================================================
-- Idempotent: fixed UUIDs + ON CONFLICT so `supabase db reset` (and
-- manual re-runs) upsert cleanly. Depends on seed.sql having created the
-- two host_profiles, the demo profiles, and reference data (wilayas,
-- communes, property_types, amenities).
--
--   individual host  10000000-0000-4000-b000-000000000001  (owner ...0002)
--   hotel host       10000000-0000-4000-b000-000000000002  (owner ...0003)
--   demo guest       00000000-0000-4000-a000-000000000001  (reviews/bookings)
--   demo guest #2    00000000-0000-4000-a000-000000000004
--   admin reviewer   00000000-0000-4000-a000-000000000005
--
-- Photo storage_path holds FULL https Unsplash URLs on purpose: the app
-- renders http(s) paths directly and otherwise builds a Storage URL.
-- geo / geo_fuzzed are NOT set here — a BEFORE trigger derives them
-- from lat/lng.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) PROPERTIES (12 approved, published, spread across wilayas/types)
-- ---------------------------------------------------------------------
insert into public.properties
  (id, host_profile_id, property_type_id, listing_kind,
   title_ar, title_fr, title_en,
   description_ar, description_fr, description_en,
   status, wilaya_code, commune_id, address_line, lat, lng,
   cancellation_tier, checkin_time, checkout_time,
   house_rules_ar, house_rules_fr, house_rules_en,
   instant_book, min_nights, max_nights, cover_photo_path,
   submitted_at, approved_at, reviewed_by, published_at)
values
  -- 01 — Alger / Hydra — apartment
  ('10000000-0000-4000-b000-000000000101',
   '10000000-0000-4000-b000-000000000001', 1, 'single_unit',
   'شقة عصرية مطلة على خليج الجزائر بحيدرة',
   'Appartement moderne avec vue sur la baie d''Alger à Hydra',
   'Modern apartment with Bay of Algiers view in Hydra',
   'شقة أنيقة في حيدرة، أحد أرقى أحياء العاصمة، قريبة من المطاعم والمحلات. شرفة واسعة تطل على الخليج، مناسبة للعائلات ورجال الأعمال.',
   'Appartement élégant à Hydra, l''un des quartiers les plus prisés d''Alger. Grand balcon avec vue sur la baie, proche des restaurants et commerces. Idéal pour familles et voyageurs d''affaires.',
   'Elegant apartment in Hydra, one of the most sought-after districts of Algiers. Large balcony overlooking the bay, close to restaurants and shops. Ideal for families and business travelers.',
   'approved', 16, 1602, 'Rue des Frères Bouadou, Hydra', 36.747500, 3.039200,
   'moderate', '14:00', '12:00',
   'ممنوع التدخين داخل الشقة. الهدوء بعد الساعة 11 ليلاً.',
   'Non-fumeur. Calme après 23h. Animaux non admis.',
   'No smoking indoors. Quiet after 11pm. No pets.',
   true, 2, 30, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
   now() - interval '40 days', now() - interval '38 days',
   '00000000-0000-4000-a000-000000000005', now() - interval '38 days'),

  -- 02 — Oran — apartment
  ('10000000-0000-4000-b000-000000000102',
   '10000000-0000-4000-b000-000000000001', 1, 'single_unit',
   'شقة بإطلالة بحرية في وهران قرب الميناء',
   'Appartement vue mer à Oran près du front de mer',
   'Sea-view apartment in Oran near the waterfront',
   'شقة مشمسة على بعد دقائق من ساحة الأول من نوفمبر وكورنيش وهران. مثالية لاكتشاف مدينة الباهية وحياتها الليلية.',
   'Appartement ensoleillé à quelques minutes de la Place du 1er Novembre et du front de mer d''Oran. Parfait pour découvrir « El Bahia » et son ambiance.',
   'Sunny apartment minutes from Place du 1er Novembre and the Oran seafront. Perfect for discovering "El Bahia" and its vibrant atmosphere.',
   'approved', 31, 3101, 'Boulevard de la Soummam, Oran', 35.697100, -0.633100,
   'flexible', '15:00', '11:00',
   'ممنوع الحفلات. احترام الجيران.',
   'Pas de fêtes. Respect du voisinage.',
   'No parties. Respect the neighbors.',
   false, 1, 21, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200',
   now() - interval '36 days', now() - interval '35 days',
   '00000000-0000-4000-a000-000000000005', now() - interval '35 days'),

  -- 03 — Tipaza — villa
  ('10000000-0000-4000-b000-000000000103',
   '10000000-0000-4000-b000-000000000001', 2, 'single_unit',
   'فيلا مع مسبح قرب آثار تيبازة الرومانية',
   'Villa avec piscine près des ruines romaines de Tipaza',
   'Villa with pool near the Roman ruins of Tipaza',
   'فيلا فاخرة بحديقة ومسبح خاص، على بعد خطوات من الموقع الأثري والبحر. مساحة مثالية للعائلات الكبيرة والإقامات الصيفية.',
   'Villa de standing avec jardin et piscine privée, à deux pas du site archéologique et de la mer. Espace idéal pour grandes familles et séjours estivaux.',
   'Upscale villa with garden and private pool, steps from the archaeological site and the sea. Ideal for large families and summer stays.',
   'approved', 42, 4201, 'Chemin de la Corniche, Tipaza', 36.594300, 2.443800,
   'strict', '15:00', '11:00',
   'ممنوع التدخين داخل الفيلا. المسبح تحت مسؤولية النزلاء.',
   'Non-fumeur à l''intérieur. Piscine sous la responsabilité des occupants. Caution demandée.',
   'No smoking indoors. Pool use at guests'' own risk. Security deposit required.',
   true, 2, 30, 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200',
   now() - interval '50 days', now() - interval '48 days',
   '00000000-0000-4000-a000-000000000005', now() - interval '48 days'),

  -- 04 — Béjaïa / Aokas — villa
  ('10000000-0000-4000-b000-000000000104',
   '10000000-0000-4000-b000-000000000001', 2, 'single_unit',
   'فيلا على شاطئ أقبو ببجاية مع إطلالة خلابة',
   'Villa en bord de mer à Aokas (Béjaïa) avec vue panoramique',
   'Beachfront villa in Aokas (Béjaïa) with panoramic view',
   'فيلا على الواجهة البحرية لأقبو، بين جبال القبائل والبحر الأبيض المتوسط. تراس واسع لمشاهدة غروب الشمس وشواء العائلة.',
   'Villa sur le littoral d''Aokas, entre les montagnes de Kabylie et la Méditerranée. Grande terrasse pour les couchers de soleil et les barbecues en famille.',
   'Villa on the Aokas coastline, between the Kabylie mountains and the Mediterranean. Large terrace for sunsets and family barbecues.',
   'approved', 6, 603, 'Route Nationale 9, Aokas', 36.642000, 5.183500,
   'moderate', '14:00', '12:00',
   'ممنوع الضجيج بعد منتصف الليل. الحفاظ على نظافة الشاطئ.',
   'Pas de bruit après minuit. Garder la plage propre.',
   'No noise after midnight. Keep the beach clean.',
   false, 2, 28, 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200',
   now() - interval '44 days', now() - interval '42 days',
   '00000000-0000-4000-a000-000000000005', now() - interval '42 days'),

  -- 05 — Constantine — guesthouse (maison d'hôtes)
  ('10000000-0000-4000-b000-000000000105',
   '10000000-0000-4000-b000-000000000001', 6, 'single_unit',
   'دار ضيافة تقليدية في قسنطينة مدينة الجسور',
   'Maison d''hôtes traditionnelle à Constantine, la ville des ponts',
   'Traditional guesthouse in Constantine, the city of bridges',
   'دار ضيافة بطابع قسنطيني أصيل، قرب جسر سيدي مسيد والمدينة العتيقة. فطور تقليدي وضيافة دافئة في قلب التاريخ.',
   'Maison d''hôtes au cachet constantinois authentique, près du pont Sidi M''Cid et de la vieille ville. Petit-déjeuner traditionnel et accueil chaleureux au cœur de l''histoire.',
   'Guesthouse with authentic Constantine character, near the Sidi M''Cid bridge and the old town. Traditional breakfast and warm hospitality in the heart of history.',
   'approved', 25, 2501, 'Rue Larbi Ben M''Hidi, Constantine', 36.365000, 6.614700,
   'moderate', '14:00', '11:00',
   'احترام طابع المنزل التقليدي. ممنوع التدخين في الغرف.',
   'Respecter le caractère traditionnel de la maison. Non-fumeur dans les chambres.',
   'Respect the traditional character of the house. No smoking in the rooms.',
   true, 1, 14, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200',
   now() - interval '33 days', now() - interval '31 days',
   '00000000-0000-4000-a000-000000000005', now() - interval '31 days'),

  -- 06 — Ghardaïa — guesthouse (maison d'hôtes / M'Zab)
  ('10000000-0000-4000-b000-000000000106',
   '10000000-0000-4000-b000-000000000001', 6, 'single_unit',
   'دار مزابية أصيلة في غرداية بوادي مزاب',
   'Maison mozabite authentique à Ghardaïa, vallée du M''Zab',
   'Authentic Mozabite house in Ghardaïa, M''Zab valley',
   'إقامة في منزل مزابي تقليدي بقلب وادي مزاب المصنف تراثاً عالمياً. أسطح وأقواس وزخارف تعكس عبقرية العمارة الصحراوية.',
   'Séjour dans une maison mozabite traditionnelle au cœur de la vallée du M''Zab, classée au patrimoine mondial. Terrasses, arcades et décor qui révèlent le génie de l''architecture saharienne.',
   'Stay in a traditional Mozabite house in the heart of the UNESCO-listed M''Zab valley. Terraces, arches and decor revealing the genius of Saharan architecture.',
   'approved', 47, 4701, 'Quartier Bouchen, Ghardaïa', 32.489400, 3.673600,
   'flexible', '14:00', '11:00',
   'احترام عادات المنطقة واللباس المحتشم. ممنوع الكحول.',
   'Respecter les coutumes locales et une tenue correcte. Alcool non autorisé.',
   'Respect local customs and modest dress. No alcohol.',
   false, 1, 20, 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=1200',
   now() - interval '29 days', now() - interval '27 days',
   '00000000-0000-4000-a000-000000000005', now() - interval '27 days'),

  -- 07 — Tamanrasset — desert camp
  ('10000000-0000-4000-b000-000000000107',
   '10000000-0000-4000-b000-000000000001', 9, 'single_unit',
   'مخيم صحراوي تحت نجوم الأهقار بتمنراست',
   'Campement saharien sous les étoiles du Hoggar à Tamanrasset',
   'Saharan camp under the Hoggar stars in Tamanrasset',
   'تجربة لا تُنسى في خيام تقليدية وسط كثبان الأهقار. عشاء طوارقي حول النار، شروق على قمم الأتاكور، وسماء مليئة بالنجوم.',
   'Expérience inoubliable sous des tentes traditionnelles au milieu des paysages du Hoggar. Dîner touareg autour du feu, lever de soleil sur l''Atakor et ciel étoilé.',
   'Unforgettable experience in traditional tents amid the Hoggar landscapes. Tuareg dinner by the fire, sunrise over the Atakor and a sky full of stars.',
   'approved', 11, 1101, 'Plateau de l''Assekrem, Tamanrasset', 22.785000, 5.522800,
   'strict', '16:00', '10:00',
   'احترام البيئة الصحراوية. اتباع تعليمات المرشد.',
   'Respect de l''environnement désertique. Suivre les consignes du guide.',
   'Respect the desert environment. Follow the guide''s instructions.',
   true, 1, 7, 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?w=1200',
   now() - interval '60 days', now() - interval '58 days',
   '00000000-0000-4000-a000-000000000005', now() - interval '58 days'),

  -- 08 — Annaba / Seraïdi — chalet
  ('10000000-0000-4000-b000-000000000108',
   '10000000-0000-4000-b000-000000000001', 7, 'single_unit',
   'شاليه جبلي في سرايدي يطل على خليج عنابة',
   'Chalet de montagne à Seraïdi surplombant la baie d''Annaba',
   'Mountain chalet in Seraïdi overlooking the Bay of Annaba',
   'شاليه خشبي دافئ على مرتفعات سرايدي وسط غابات الإيدوغ، بإطلالة بانورامية على خليج عنابة. ملاذ هادئ بعيداً عن صخب المدينة.',
   'Chalet en bois chaleureux sur les hauteurs de Seraïdi, au milieu des forêts de l''Edough, avec vue panoramique sur la baie d''Annaba. Refuge paisible loin de l''agitation.',
   'Cozy wooden chalet on the heights of Seraïdi, amid the Edough forests, with a panoramic view of the Bay of Annaba. A peaceful retreat away from the bustle.',
   'approved', 23, 2302, 'Route de Seraïdi, Annaba', 36.926000, 7.668000,
   'moderate', '15:00', '11:00',
   'الحذر مع المدفأة. ممنوع إشعال النار خارج المواقد.',
   'Prudence avec le chauffage. Pas de feu en dehors des foyers prévus.',
   'Use the heater with care. No open fires outside designated spots.',
   false, 2, 21, 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=1200',
   now() - interval '38 days', now() - interval '36 days',
   '00000000-0000-4000-a000-000000000005', now() - interval '36 days'),

  -- 09 — Tlemcen — bungalow
  ('10000000-0000-4000-b000-000000000109',
   '10000000-0000-4000-b000-000000000001', 8, 'single_unit',
   'بنغالو هادئ قرب شلالات الأوريط بتلمسان',
   'Bungalow paisible près des cascades d''El Ourit à Tlemcen',
   'Quiet bungalow near the El Ourit waterfalls in Tlemcen',
   'بنغالو محاط بالخضرة قرب شلالات الأوريط وهضبة لالة ستي. انطلاقة مثالية لاكتشاف تراث تلمسان الأندلسي ومنبع منصورة.',
   'Bungalow entouré de verdure près des cascades d''El Ourit et du plateau de Lalla Setti. Point de départ idéal pour découvrir l''héritage andalou de Tlemcen et Mansourah.',
   'Bungalow surrounded by greenery near the El Ourit waterfalls and the Lalla Setti plateau. An ideal base to explore Tlemcen''s Andalusian heritage and Mansourah.',
   'approved', 13, 1301, 'Plateau Lalla Setti, Tlemcen', 34.866000, -1.315000,
   'flexible', '14:00', '12:00',
   'الحفاظ على هدوء المكان الطبيعي. فرز النفايات.',
   'Préserver le calme du site naturel. Trier les déchets.',
   'Preserve the calm of the natural site. Sort your waste.',
   true, 1, 21, 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200',
   now() - interval '31 days', now() - interval '29 days',
   '00000000-0000-4000-a000-000000000005', now() - interval '29 days'),

  -- 10 — Jijel / Ziama Mansouriah — bungalow
  ('10000000-0000-4000-b000-000000000110',
   '10000000-0000-4000-b000-000000000001', 8, 'single_unit',
   'بنغالو على الكورنيش الجيجلي بزيامة منصورية',
   'Bungalow sur la corniche jijelienne à Ziama Mansouriah',
   'Bungalow on the Jijel corniche at Ziama Mansouriah',
   'بنغالو على بعد دقائق من المياه الفيروزية لكورنيش جيجل ومغارة عجائب الطبيعة. مثالي للعائلات الباحثة عن البحر والهدوء.',
   'Bungalow à quelques minutes des eaux turquoise de la corniche de Jijel et des Grottes Merveilleuses. Idéal pour les familles en quête de mer et de tranquillité.',
   'Bungalow minutes from the turquoise waters of the Jijel corniche and the Grottes Merveilleuses. Ideal for families seeking sea and calm.',
   'approved', 18, 1802, 'Corniche RN43, Ziama Mansouriah', 36.661000, 5.690000,
   'moderate', '14:00', '11:00',
   'ممنوع الشواء داخل البنغالو. احترام أوقات الراحة.',
   'Pas de barbecue à l''intérieur. Respecter les heures de repos.',
   'No barbecue indoors. Respect quiet hours.',
   true, 2, 21, 'https://images.unsplash.com/photo-1505881502353-a1986add3762?w=1200',
   now() - interval '27 days', now() - interval '25 days',
   '00000000-0000-4000-a000-000000000005', now() - interval '25 days'),

  -- 11 — Adrar — guesthouse (ksar / no commune row, wilaya-level)
  ('10000000-0000-4000-b000-000000000111',
   '10000000-0000-4000-b000-000000000001', 6, 'single_unit',
   'دار ضيافة في قصر أدرار وسط واحات توات',
   'Maison d''hôtes dans un ksar d''Adrar, oasis du Touat',
   'Guesthouse in an Adrar ksar, Touat oasis',
   'إقامة في قصر طيني تقليدي بأدرار، حيث الفقارات والنخيل وسحر الصحراء. تجربة أصيلة لاكتشاف العمارة الترابية وكرم أهل توات.',
   'Séjour dans un ksar en terre traditionnel à Adrar, entre foggaras, palmeraies et magie du désert. Une expérience authentique de l''architecture en pisé et de l''hospitalité du Touat.',
   'Stay in a traditional earthen ksar in Adrar, among foggaras, palm groves and desert magic. An authentic experience of mud architecture and Touat hospitality.',
   'approved', 1, null, 'Ksar de Timimoun, Adrar', 27.870000, -0.288000,
   'flexible', '14:00', '11:00',
   'احترام عادات الواحة واللباس المحتشم. ممنوع الكحول.',
   'Respecter les coutumes de l''oasis et une tenue correcte. Alcool non autorisé.',
   'Respect oasis customs and modest dress. No alcohol.',
   false, 1, 20, 'https://images.unsplash.com/photo-1518623489648-a173ef7824f3?w=1200',
   now() - interval '46 days', now() - interval '44 days',
   '00000000-0000-4000-a000-000000000005', now() - interval '44 days'),

  -- 12 — Alger / Sidi M'Hamed — HOTEL (multi_room, hotel host)
  ('10000000-0000-4000-b000-000000000112',
   '10000000-0000-4000-b000-000000000002', 5, 'multi_room',
   'فندق أطلس الجزائر في قلب العاصمة',
   'Hôtel Atlas Alger au cœur de la capitale',
   'Hôtel Atlas Alger in the heart of the capital',
   'فندق عصري في وسط الجزائر العاصمة، قرب البريد المركزي وحديقة التجارب. غرف مريحة، فطور جزائري، وخدمة على مدار الساعة لرجال الأعمال والسياح.',
   'Hôtel moderne au centre d''Alger, près de la Grande Poste et du Jardin d''Essai. Chambres confortables, petit-déjeuner algérien et service 24h/24 pour affaires et tourisme.',
   'Modern hotel in central Algiers, near the Grande Poste and the Jardin d''Essai. Comfortable rooms, Algerian breakfast and 24/7 service for business and leisure.',
   'approved', 16, 1604, 'Rue Hassiba Ben Bouali, Sidi M''Hamed, Alger', 36.752000, 3.055000,
   'strict', '14:00', '12:00',
   'تقديم بطاقة هوية عند الوصول. ممنوع التدخين في الغرف.',
   'Pièce d''identité à la réception. Non-fumeur dans les chambres.',
   'ID required at check-in. No smoking in rooms.',
   true, 1, null, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200',
   now() - interval '70 days', now() - interval '68 days',
   '00000000-0000-4000-a000-000000000005', now() - interval '68 days')
on conflict (id) do update set
  host_profile_id   = excluded.host_profile_id,
  property_type_id  = excluded.property_type_id,
  listing_kind      = excluded.listing_kind,
  title_ar          = excluded.title_ar,
  title_fr          = excluded.title_fr,
  title_en          = excluded.title_en,
  description_ar    = excluded.description_ar,
  description_fr    = excluded.description_fr,
  description_en    = excluded.description_en,
  status            = excluded.status,
  wilaya_code       = excluded.wilaya_code,
  commune_id        = excluded.commune_id,
  address_line      = excluded.address_line,
  lat               = excluded.lat,
  lng               = excluded.lng,
  cancellation_tier = excluded.cancellation_tier,
  checkin_time      = excluded.checkin_time,
  checkout_time     = excluded.checkout_time,
  house_rules_ar    = excluded.house_rules_ar,
  house_rules_fr    = excluded.house_rules_fr,
  house_rules_en    = excluded.house_rules_en,
  instant_book      = excluded.instant_book,
  min_nights        = excluded.min_nights,
  max_nights        = excluded.max_nights,
  cover_photo_path  = excluded.cover_photo_path,
  submitted_at      = excluded.submitted_at,
  approved_at       = excluded.approved_at,
  reviewed_by       = excluded.reviewed_by,
  published_at      = excluded.published_at;

-- ---------------------------------------------------------------------
-- 2) ROOM TYPES
--    Single homes: one is_default row. Hotel (112): 3 room types.
-- ---------------------------------------------------------------------
insert into public.room_types
  (id, property_id, name_ar, name_fr, name_en, is_default,
   base_occupancy, max_occupancy, max_adults, max_children, bed_config,
   size_sqm, base_price_dzd, weekend_price_dzd, cleaning_fee_dzd,
   extra_guest_fee_dzd, inventory_count, is_active, sort_order)
values
  -- 01 Alger apartment
  ('10000000-0000-4000-b000-000000000201',
   '10000000-0000-4000-b000-000000000101',
   'الشقة بأكملها', 'Logement entier', 'Entire apartment', true,
   2, 4, 4, 2, '[{"type":"double","count":1},{"type":"sofa","count":1}]'::jsonb,
   85, 11000, 13000, 2000, 1500, 1, true, 0),

  -- 02 Oran apartment
  ('10000000-0000-4000-b000-000000000202',
   '10000000-0000-4000-b000-000000000102',
   'الشقة بأكملها', 'Logement entier', 'Entire apartment', true,
   2, 3, 3, 1, '[{"type":"double","count":1},{"type":"single","count":1}]'::jsonb,
   70, 8500, 10000, 1500, 1200, 1, true, 0),

  -- 03 Tipaza villa
  ('10000000-0000-4000-b000-000000000203',
   '10000000-0000-4000-b000-000000000103',
   'الفيلا بأكملها', 'Villa entière', 'Entire villa', true,
   6, 10, 8, 4, '[{"type":"double","count":3},{"type":"single","count":2},{"type":"sofa","count":1}]'::jsonb,
   240, 38000, 45000, 5000, 2500, 1, true, 0),

  -- 04 Béjaïa villa
  ('10000000-0000-4000-b000-000000000204',
   '10000000-0000-4000-b000-000000000104',
   'الفيلا بأكملها', 'Villa entière', 'Entire villa', true,
   4, 8, 6, 3, '[{"type":"double","count":2},{"type":"single","count":2},{"type":"sofa","count":1}]'::jsonb,
   180, 26000, 32000, 4000, 2000, 1, true, 0),

  -- 05 Constantine guesthouse
  ('10000000-0000-4000-b000-000000000205',
   '10000000-0000-4000-b000-000000000105',
   'الدار بأكملها', 'Maison entière', 'Entire guesthouse', true,
   2, 5, 4, 2, '[{"type":"double","count":2},{"type":"single","count":1}]'::jsonb,
   110, 9500, 11500, 1800, 1500, 1, true, 0),

  -- 06 Ghardaïa guesthouse
  ('10000000-0000-4000-b000-000000000206',
   '10000000-0000-4000-b000-000000000106',
   'الدار المزابية', 'Maison mozabite', 'Mozabite house', true,
   2, 6, 4, 2, '[{"type":"double","count":2},{"type":"floor_mattress","count":2}]'::jsonb,
   130, 8000, 9500, 1500, 1200, 1, true, 0),

  -- 07 Tamanrasset desert camp
  ('10000000-0000-4000-b000-000000000207',
   '10000000-0000-4000-b000-000000000107',
   'خيمة طوارقية', 'Tente touareg', 'Tuareg tent', true,
   2, 4, 4, 2, '[{"type":"floor_mattress","count":4}]'::jsonb,
   30, 12000, 14000, 1000, 2000, 5, true, 0),

  -- 08 Annaba chalet
  ('10000000-0000-4000-b000-000000000208',
   '10000000-0000-4000-b000-000000000108',
   'الشاليه بأكمله', 'Chalet entier', 'Entire chalet', true,
   2, 6, 4, 2, '[{"type":"double","count":2},{"type":"bunk","count":1}]'::jsonb,
   95, 14000, 17000, 2500, 1500, 1, true, 0),

  -- 09 Tlemcen bungalow
  ('10000000-0000-4000-b000-000000000209',
   '10000000-0000-4000-b000-000000000109',
   'البنغالو بأكمله', 'Bungalow entier', 'Entire bungalow', true,
   2, 4, 3, 2, '[{"type":"double","count":1},{"type":"single","count":2}]'::jsonb,
   60, 7500, 9000, 1500, 1200, 1, true, 0),

  -- 10 Jijel bungalow
  ('10000000-0000-4000-b000-000000000210',
   '10000000-0000-4000-b000-000000000110',
   'البنغالو بأكمله', 'Bungalow entier', 'Entire bungalow', true,
   2, 5, 4, 2, '[{"type":"double","count":1},{"type":"single","count":2},{"type":"sofa","count":1}]'::jsonb,
   65, 9000, 11000, 1500, 1500, 1, true, 0),

  -- 11 Adrar guesthouse
  ('10000000-0000-4000-b000-000000000211',
   '10000000-0000-4000-b000-000000000111',
   'الدار الطينية', 'Maison en terre', 'Earthen house', true,
   2, 6, 4, 2, '[{"type":"double","count":2},{"type":"floor_mattress","count":2}]'::jsonb,
   120, 7000, 8500, 1200, 1000, 1, true, 0),

  -- 12 Hotel Atlas Alger — 3 room types (NOT default; multi_room)
  ('10000000-0000-4000-b000-000000000212',
   '10000000-0000-4000-b000-000000000112',
   'غرفة فردية ستاندرد', 'Chambre Single Standard', 'Standard Single Room', false,
   1, 1, 1, 0, '[{"type":"single","count":1}]'::jsonb,
   18, 9000, 10000, 800, 0, 8, true, 1),
  ('10000000-0000-4000-b000-000000000213',
   '10000000-0000-4000-b000-000000000112',
   'غرفة مزدوجة', 'Chambre Double', 'Double Room', false,
   2, 2, 2, 1, '[{"type":"double","count":1}]'::jsonb,
   24, 13000, 15000, 1000, 1500, 12, true, 2),
  ('10000000-0000-4000-b000-000000000214',
   '10000000-0000-4000-b000-000000000112',
   'جناح تنفيذي', 'Suite Exécutive', 'Executive Suite', false,
   2, 4, 4, 2, '[{"type":"king","count":1},{"type":"sofa","count":1}]'::jsonb,
   45, 22000, 26000, 1500, 2500, 4, true, 3)
on conflict (id) do update set
  property_id         = excluded.property_id,
  name_ar             = excluded.name_ar,
  name_fr             = excluded.name_fr,
  name_en             = excluded.name_en,
  is_default          = excluded.is_default,
  base_occupancy      = excluded.base_occupancy,
  max_occupancy       = excluded.max_occupancy,
  max_adults          = excluded.max_adults,
  max_children        = excluded.max_children,
  bed_config          = excluded.bed_config,
  size_sqm            = excluded.size_sqm,
  base_price_dzd      = excluded.base_price_dzd,
  weekend_price_dzd   = excluded.weekend_price_dzd,
  cleaning_fee_dzd    = excluded.cleaning_fee_dzd,
  extra_guest_fee_dzd = excluded.extra_guest_fee_dzd,
  inventory_count     = excluded.inventory_count,
  is_active           = excluded.is_active,
  sort_order          = excluded.sort_order;

-- ---------------------------------------------------------------------
-- 3) PROPERTY PHOTOS (3-5 each; storage_path = full https Unsplash URL).
--    Deterministic ids: 10000000-...-03PP0S (PP=property, S=slot).
--    Wipe & reinsert per property so re-runs stay clean.
-- ---------------------------------------------------------------------
delete from public.property_photos
 where property_id in (
   '10000000-0000-4000-b000-000000000101','10000000-0000-4000-b000-000000000102',
   '10000000-0000-4000-b000-000000000103','10000000-0000-4000-b000-000000000104',
   '10000000-0000-4000-b000-000000000105','10000000-0000-4000-b000-000000000106',
   '10000000-0000-4000-b000-000000000107','10000000-0000-4000-b000-000000000108',
   '10000000-0000-4000-b000-000000000109','10000000-0000-4000-b000-000000000110',
   '10000000-0000-4000-b000-000000000111','10000000-0000-4000-b000-000000000112');

insert into public.property_photos
  (id, property_id, storage_path, alt_fr, sort_order, is_cover)
values
  -- 01 Alger apartment (4)
  ('10000000-0000-4000-b000-000003010101','10000000-0000-4000-b000-000000000101','https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200','Salon avec vue sur la baie',0,true),
  ('10000000-0000-4000-b000-000003010102','10000000-0000-4000-b000-000000000101','https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200','Chambre principale',1,false),
  ('10000000-0000-4000-b000-000003010103','10000000-0000-4000-b000-000000000101','https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=1200','Cuisine équipée',2,false),
  ('10000000-0000-4000-b000-000003010104','10000000-0000-4000-b000-000000000101','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200','Balcon',3,false),

  -- 02 Oran apartment (4)
  ('10000000-0000-4000-b000-000003010201','10000000-0000-4000-b000-000000000102','https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200','Séjour lumineux',0,true),
  ('10000000-0000-4000-b000-000003010202','10000000-0000-4000-b000-000000000102','https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200','Chambre',1,false),
  ('10000000-0000-4000-b000-000003010203','10000000-0000-4000-b000-000000000102','https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200','Coin cuisine',2,false),
  ('10000000-0000-4000-b000-000003010204','10000000-0000-4000-b000-000000000102','https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=1200','Salle de bain',3,false),

  -- 03 Tipaza villa (5)
  ('10000000-0000-4000-b000-000003010301','10000000-0000-4000-b000-000000000103','https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200','Façade de la villa',0,true),
  ('10000000-0000-4000-b000-000003010302','10000000-0000-4000-b000-000000000103','https://images.unsplash.com/photo-1572331165267-854da2b10ccc?w=1200','Piscine privée',1,false),
  ('10000000-0000-4000-b000-000003010303','10000000-0000-4000-b000-000000000103','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200','Salon spacieux',2,false),
  ('10000000-0000-4000-b000-000003010304','10000000-0000-4000-b000-000000000103','https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200','Chambre avec terrasse',3,false),
  ('10000000-0000-4000-b000-000003010305','10000000-0000-4000-b000-000000000103','https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200','Jardin et oliviers',4,false),

  -- 04 Béjaïa villa (4)
  ('10000000-0000-4000-b000-000003010401','10000000-0000-4000-b000-000000000104','https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200','Vue mer depuis la terrasse',0,true),
  ('10000000-0000-4000-b000-000003010402','10000000-0000-4000-b000-000000000104','https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200','Salon ouvert',1,false),
  ('10000000-0000-4000-b000-000003010403','10000000-0000-4000-b000-000000000104','https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200','Chambre cosy',2,false),
  ('10000000-0000-4000-b000-000003010404','10000000-0000-4000-b000-000000000104','https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200','Terrasse barbecue',3,false),

  -- 05 Constantine guesthouse (4)
  ('10000000-0000-4000-b000-000003010501','10000000-0000-4000-b000-000000000105','https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200','Patio traditionnel',0,true),
  ('10000000-0000-4000-b000-000003010502','10000000-0000-4000-b000-000000000105','https://images.unsplash.com/photo-1551105378-78e609e1d468?w=1200','Chambre d''hôtes',1,false),
  ('10000000-0000-4000-b000-000003010503','10000000-0000-4000-b000-000000000105','https://images.unsplash.com/photo-1466442929976-97f336a657be?w=1200','Vue sur la vieille ville',2,false),
  ('10000000-0000-4000-b000-000003010504','10000000-0000-4000-b000-000000000105','https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200','Petit-déjeuner servi',3,false),

  -- 06 Ghardaïa guesthouse (4)
  ('10000000-0000-4000-b000-000003010601','10000000-0000-4000-b000-000000000106','https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=1200','Architecture mozabite',0,true),
  ('10000000-0000-4000-b000-000003010602','10000000-0000-4000-b000-000000000106','https://images.unsplash.com/photo-1518623489648-a173ef7824f3?w=1200','Terrasse sur le ksar',1,false),
  ('10000000-0000-4000-b000-000003010603','10000000-0000-4000-b000-000000000106','https://images.unsplash.com/photo-1604147706283-d7119b5b822c?w=1200','Salon traditionnel',2,false),
  ('10000000-0000-4000-b000-000003010604','10000000-0000-4000-b000-000000000106','https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200','Chambre voûtée',3,false),

  -- 07 Tamanrasset desert camp (5)
  ('10000000-0000-4000-b000-000003010701','10000000-0000-4000-b000-000000000107','https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?w=1200','Campement au coucher du soleil',0,true),
  ('10000000-0000-4000-b000-000003010702','10000000-0000-4000-b000-000000000107','https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200','Tente sous les étoiles',1,false),
  ('10000000-0000-4000-b000-000003010703','10000000-0000-4000-b000-000000000107','https://images.unsplash.com/photo-1542401886-65d6c61db217?w=1200','Dunes du Hoggar',2,false),
  ('10000000-0000-4000-b000-000003010704','10000000-0000-4000-b000-000000000107','https://images.unsplash.com/photo-1535941339077-2dd1c7963098?w=1200','Feu de camp touareg',3,false),
  ('10000000-0000-4000-b000-000003010705','10000000-0000-4000-b000-000000000107','https://images.unsplash.com/photo-1414609245224-afa02bfb3fda?w=1200','Lever de soleil sur l''Atakor',4,false),

  -- 08 Annaba chalet (4)
  ('10000000-0000-4000-b000-000003010801','10000000-0000-4000-b000-000000000108','https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=1200','Chalet en forêt',0,true),
  ('10000000-0000-4000-b000-000003010802','10000000-0000-4000-b000-000000000108','https://images.unsplash.com/photo-1518732714860-b62714ce0c59?w=1200','Vue sur la baie',1,false),
  ('10000000-0000-4000-b000-000003010803','10000000-0000-4000-b000-000000000108','https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1200','Salon avec cheminée',2,false),
  ('10000000-0000-4000-b000-000003010804','10000000-0000-4000-b000-000000000108','https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=1200','Chambre boisée',3,false),

  -- 09 Tlemcen bungalow (3)
  ('10000000-0000-4000-b000-000003010901','10000000-0000-4000-b000-000000000109','https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200','Bungalow dans la verdure',0,true),
  ('10000000-0000-4000-b000-000003010902','10000000-0000-4000-b000-000000000109','https://images.unsplash.com/photo-1564078516393-cf04bd966897?w=1200','Intérieur cosy',1,false),
  ('10000000-0000-4000-b000-000003010903','10000000-0000-4000-b000-000000000109','https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?w=1200','Cascades d''El Ourit',2,false),

  -- 10 Jijel bungalow (4)
  ('10000000-0000-4000-b000-000003011001','10000000-0000-4000-b000-000000000110','https://images.unsplash.com/photo-1505881502353-a1986add3762?w=1200','Bungalow vue mer',0,true),
  ('10000000-0000-4000-b000-000003011002','10000000-0000-4000-b000-000000000110','https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200','Eaux turquoise',1,false),
  ('10000000-0000-4000-b000-000003011003','10000000-0000-4000-b000-000000000110','https://images.unsplash.com/photo-1582610116397-edb318620f90?w=1200','Chambre familiale',2,false),
  ('10000000-0000-4000-b000-000003011004','10000000-0000-4000-b000-000000000110','https://images.unsplash.com/photo-1559599189-fe84dea4eb79?w=1200','Terrasse sur la corniche',3,false),

  -- 11 Adrar guesthouse (4)
  ('10000000-0000-4000-b000-000003011101','10000000-0000-4000-b000-000000000111','https://images.unsplash.com/photo-1518623489648-a173ef7824f3?w=1200','Ksar en terre',0,true),
  ('10000000-0000-4000-b000-000003011102','10000000-0000-4000-b000-000000000111','https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1200','Palmeraie du Touat',1,false),
  ('10000000-0000-4000-b000-000003011103','10000000-0000-4000-b000-000000000111','https://images.unsplash.com/photo-1604147706283-d7119b5b822c?w=1200','Salon en pisé',2,false),
  ('10000000-0000-4000-b000-000003011104','10000000-0000-4000-b000-000000000111','https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200','Coucher de soleil sur l''oasis',3,false),

  -- 12 Hotel Atlas Alger (5) — last two tied to specific room types
  ('10000000-0000-4000-b000-000003011201','10000000-0000-4000-b000-000000000112','https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200','Façade de l''hôtel',0,true),
  ('10000000-0000-4000-b000-000003011202','10000000-0000-4000-b000-000000000112','https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200','Lobby de réception',1,false),
  ('10000000-0000-4000-b000-000003011203','10000000-0000-4000-b000-000000000112','https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200','Restaurant petit-déjeuner',2,false),
  ('10000000-0000-4000-b000-000003011204','10000000-0000-4000-b000-000000000112','https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200','Chambre double',3,false),
  ('10000000-0000-4000-b000-000003011205','10000000-0000-4000-b000-000000000112','https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200','Suite exécutive',4,false);

-- Tie two hotel photos to their room types (FK is SET NULL on delete; safe).
update public.property_photos
   set room_type_id = '10000000-0000-4000-b000-000000000213'
 where id = '10000000-0000-4000-b000-000003011204';
update public.property_photos
   set room_type_id = '10000000-0000-4000-b000-000000000214'
 where id = '10000000-0000-4000-b000-000003011205';

-- ---------------------------------------------------------------------
-- 4) PROPERTY AMENITIES (4-8 relevant ids per property).
--    Reset per property, then insert.
-- ---------------------------------------------------------------------
delete from public.property_amenities
 where property_id in (
   '10000000-0000-4000-b000-000000000101','10000000-0000-4000-b000-000000000102',
   '10000000-0000-4000-b000-000000000103','10000000-0000-4000-b000-000000000104',
   '10000000-0000-4000-b000-000000000105','10000000-0000-4000-b000-000000000106',
   '10000000-0000-4000-b000-000000000107','10000000-0000-4000-b000-000000000108',
   '10000000-0000-4000-b000-000000000109','10000000-0000-4000-b000-000000000110',
   '10000000-0000-4000-b000-000000000111','10000000-0000-4000-b000-000000000112');

insert into public.property_amenities (property_id, amenity_id)
values
  -- 01 Alger apt: wifi, ac, tv, workspace, kitchen, elevator, hot_water, smoke_alarm
  ('10000000-0000-4000-b000-000000000101',1),('10000000-0000-4000-b000-000000000101',2),
  ('10000000-0000-4000-b000-000000000101',4),('10000000-0000-4000-b000-000000000101',5),
  ('10000000-0000-4000-b000-000000000101',12),('10000000-0000-4000-b000-000000000101',29),
  ('10000000-0000-4000-b000-000000000101',18),('10000000-0000-4000-b000-000000000101',22),
  -- 02 Oran apt: wifi, ac, tv, kitchen, sea_view, hot_water
  ('10000000-0000-4000-b000-000000000102',1),('10000000-0000-4000-b000-000000000102',2),
  ('10000000-0000-4000-b000-000000000102',4),('10000000-0000-4000-b000-000000000102',12),
  ('10000000-0000-4000-b000-000000000102',10),('10000000-0000-4000-b000-000000000102',18),
  -- 03 Tipaza villa: wifi, ac, pool, garden, parking, bbq, kitchen, sea_view
  ('10000000-0000-4000-b000-000000000103',1),('10000000-0000-4000-b000-000000000103',2),
  ('10000000-0000-4000-b000-000000000103',7),('10000000-0000-4000-b000-000000000103',9),
  ('10000000-0000-4000-b000-000000000103',6),('10000000-0000-4000-b000-000000000103',11),
  ('10000000-0000-4000-b000-000000000103',12),('10000000-0000-4000-b000-000000000103',10),
  -- 04 Béjaïa villa: wifi, sea_view, terrace, bbq, parking, kitchen, garden
  ('10000000-0000-4000-b000-000000000104',1),('10000000-0000-4000-b000-000000000104',10),
  ('10000000-0000-4000-b000-000000000104',8),('10000000-0000-4000-b000-000000000104',11),
  ('10000000-0000-4000-b000-000000000104',6),('10000000-0000-4000-b000-000000000104',12),
  ('10000000-0000-4000-b000-000000000104',9),
  -- 05 Constantine guesthouse: wifi, heating, breakfast, hot_water, terrace, kitchen
  ('10000000-0000-4000-b000-000000000105',1),('10000000-0000-4000-b000-000000000105',3),
  ('10000000-0000-4000-b000-000000000105',30),('10000000-0000-4000-b000-000000000105',18),
  ('10000000-0000-4000-b000-000000000105',8),('10000000-0000-4000-b000-000000000105',12),
  -- 06 Ghardaïa guesthouse: wifi, ac, breakfast, terrace, hot_water, parking
  ('10000000-0000-4000-b000-000000000106',1),('10000000-0000-4000-b000-000000000106',2),
  ('10000000-0000-4000-b000-000000000106',30),('10000000-0000-4000-b000-000000000106',8),
  ('10000000-0000-4000-b000-000000000106',18),('10000000-0000-4000-b000-000000000106',6),
  -- 07 Tamanrasset camp: breakfast, bbq, generator, first_aid, parking, airport_shuttle
  ('10000000-0000-4000-b000-000000000107',30),('10000000-0000-4000-b000-000000000107',11),
  ('10000000-0000-4000-b000-000000000107',26),('10000000-0000-4000-b000-000000000107',23),
  ('10000000-0000-4000-b000-000000000107',6),('10000000-0000-4000-b000-000000000107',31),
  -- 08 Annaba chalet: wifi, heating, parking, terrace, kitchen, fire_extinguisher, garden
  ('10000000-0000-4000-b000-000000000108',1),('10000000-0000-4000-b000-000000000108',3),
  ('10000000-0000-4000-b000-000000000108',6),('10000000-0000-4000-b000-000000000108',8),
  ('10000000-0000-4000-b000-000000000108',12),('10000000-0000-4000-b000-000000000108',24),
  ('10000000-0000-4000-b000-000000000108',9),
  -- 09 Tlemcen bungalow: wifi, heating, parking, garden, kitchen, hot_water
  ('10000000-0000-4000-b000-000000000109',1),('10000000-0000-4000-b000-000000000109',3),
  ('10000000-0000-4000-b000-000000000109',6),('10000000-0000-4000-b000-000000000109',9),
  ('10000000-0000-4000-b000-000000000109',12),('10000000-0000-4000-b000-000000000109',18),
  -- 10 Jijel bungalow: wifi, ac, sea_view, terrace, parking, kitchen, bbq
  ('10000000-0000-4000-b000-000000000110',1),('10000000-0000-4000-b000-000000000110',2),
  ('10000000-0000-4000-b000-000000000110',10),('10000000-0000-4000-b000-000000000110',8),
  ('10000000-0000-4000-b000-000000000110',6),('10000000-0000-4000-b000-000000000110',12),
  ('10000000-0000-4000-b000-000000000110',11),
  -- 11 Adrar guesthouse: wifi, ac, breakfast, terrace, parking, hot_water
  ('10000000-0000-4000-b000-000000000111',1),('10000000-0000-4000-b000-000000000111',2),
  ('10000000-0000-4000-b000-000000000111',30),('10000000-0000-4000-b000-000000000111',8),
  ('10000000-0000-4000-b000-000000000111',6),('10000000-0000-4000-b000-000000000111',18),
  -- 12 Hotel: wifi, ac, tv, breakfast, elevator, parking, airport_shuttle, security_cameras
  ('10000000-0000-4000-b000-000000000112',1),('10000000-0000-4000-b000-000000000112',2),
  ('10000000-0000-4000-b000-000000000112',4),('10000000-0000-4000-b000-000000000112',30),
  ('10000000-0000-4000-b000-000000000112',29),('10000000-0000-4000-b000-000000000112',6),
  ('10000000-0000-4000-b000-000000000112',31),('10000000-0000-4000-b000-000000000112',25)
on conflict (property_id, amenity_id) do nothing;

-- ---------------------------------------------------------------------
-- 5) DEMO BOOKINGS + REVIEWS
--    Reviews require a COMPLETED booking (FK + trigger updates ratings).
--    bookings_guard_transition forbids inserting a terminal status, so we
--    insert each booking as 'confirmed' (allowed via SQL since the guard
--    only blocks non requested/awaiting_payment on INSERT? -> it only
--    permits requested/awaiting_payment on INSERT). We therefore insert
--    as 'awaiting_payment' then walk the state machine to 'completed'.
--    All dates are in the PAST so completed stays are valid and the
--    single-unit no-overlap exclusion (awaiting/confirmed/checked_in)
--    does not block future availability.
--    commission_bps = 1000 (platform default, 10%).
-- ---------------------------------------------------------------------

-- Clean any prior demo bookings/reviews (CASCADE clears reviews via FK).
delete from public.bookings
 where id in (
   '10000000-0000-4000-b000-000004000001','10000000-0000-4000-b000-000004000002',
   '10000000-0000-4000-b000-000004000003','10000000-0000-4000-b000-000004000004',
   '10000000-0000-4000-b000-000004000005');

-- Insert as awaiting_payment (allowed initial state), then advance.
insert into public.bookings
  (id, code, property_id, room_type_id, guest_id, host_profile_id,
   check_in, check_out, adults, children, units, status,
   nightly_subtotal_dzd, cleaning_fee_dzd, total_dzd,
   commission_bps, cancellation_tier)
values
  -- guest ...0001 stayed at Alger apt (101/201)
  ('10000000-0000-4000-b000-000004000001','DYF-DEMO-001',
   '10000000-0000-4000-b000-000000000101','10000000-0000-4000-b000-000000000201',
   '00000000-0000-4000-a000-000000000001','10000000-0000-4000-b000-000000000001',
   current_date - interval '40 days', current_date - interval '37 days',
   2, 0, 1, 'awaiting_payment',
   33000, 2000, 35000, 1000, 'moderate'),
  -- guest ...0001 stayed at Tipaza villa (103/203)
  ('10000000-0000-4000-b000-000004000002','DYF-DEMO-002',
   '10000000-0000-4000-b000-000000000103','10000000-0000-4000-b000-000000000203',
   '00000000-0000-4000-a000-000000000001','10000000-0000-4000-b000-000000000001',
   current_date - interval '30 days', current_date - interval '26 days',
   6, 2, 1, 'awaiting_payment',
   152000, 5000, 157000, 1000, 'strict'),
  -- guest ...0004 stayed at Constantine guesthouse (105/205)
  ('10000000-0000-4000-b000-000004000003','DYF-DEMO-003',
   '10000000-0000-4000-b000-000000000105','10000000-0000-4000-b000-000000000205',
   '00000000-0000-4000-a000-000000000004','10000000-0000-4000-b000-000000000001',
   current_date - interval '22 days', current_date - interval '19 days',
   2, 1, 1, 'awaiting_payment',
   28500, 1800, 30300, 1000, 'moderate'),
  -- guest ...0001 stayed at Tamanrasset camp (107/207)
  ('10000000-0000-4000-b000-000004000004','DYF-DEMO-004',
   '10000000-0000-4000-b000-000000000107','10000000-0000-4000-b000-000000000207',
   '00000000-0000-4000-a000-000000000001','10000000-0000-4000-b000-000000000001',
   current_date - interval '35 days', current_date - interval '33 days',
   2, 0, 1, 'awaiting_payment',
   24000, 1000, 25000, 1000, 'strict'),
  -- guest ...0004 stayed at Hotel double room (112/213)
  ('10000000-0000-4000-b000-000004000005','DYF-DEMO-005',
   '10000000-0000-4000-b000-000000000112','10000000-0000-4000-b000-000000000213',
   '00000000-0000-4000-a000-000000000004','10000000-0000-4000-b000-000000000002',
   current_date - interval '18 days', current_date - interval '15 days',
   2, 0, 1, 'awaiting_payment',
   39000, 1000, 40000, 1000, 'strict');

-- Walk the state machine: awaiting_payment -> confirmed -> checked_in -> completed.
update public.bookings set status = 'confirmed'
 where id in ('10000000-0000-4000-b000-000004000001','10000000-0000-4000-b000-000004000002',
              '10000000-0000-4000-b000-000004000003','10000000-0000-4000-b000-000004000004',
              '10000000-0000-4000-b000-000004000005');
update public.bookings set status = 'checked_in'
 where id in ('10000000-0000-4000-b000-000004000001','10000000-0000-4000-b000-000004000002',
              '10000000-0000-4000-b000-000004000003','10000000-0000-4000-b000-000004000004',
              '10000000-0000-4000-b000-000004000005');
update public.bookings set status = 'completed'
 where id in ('10000000-0000-4000-b000-000004000001','10000000-0000-4000-b000-000004000002',
              '10000000-0000-4000-b000-000004000003','10000000-0000-4000-b000-000004000004',
              '10000000-0000-4000-b000-000004000005');

-- Reviews (target='property'). Insert pending, then publish so the
-- reviews_refresh_property_rating trigger updates rating_avg/review_count
-- (public read requires status='published').
delete from public.reviews
 where id in (
   '10000000-0000-4000-b000-000005000001','10000000-0000-4000-b000-000005000002',
   '10000000-0000-4000-b000-000005000003','10000000-0000-4000-b000-000005000004',
   '10000000-0000-4000-b000-000005000005');

insert into public.reviews
  (id, booking_id, property_id, author_id, target, status,
   overall, cleanliness, accuracy, communication, location, value, checkin, comment_text)
values
  ('10000000-0000-4000-b000-000005000001','10000000-0000-4000-b000-000004000001',
   '10000000-0000-4000-b000-000000000101','00000000-0000-4000-a000-000000000001',
   'property','pending',5,5,5,5,5,4,5,
   'Appartement impeccable avec une vue magnifique sur la baie. Hôte très réactif, je recommande vivement !'),
  ('10000000-0000-4000-b000-000005000002','10000000-0000-4000-b000-000004000002',
   '10000000-0000-4000-b000-000000000103','00000000-0000-4000-a000-000000000001',
   'property','pending',5,5,4,5,5,4,5,
   'Villa spacieuse, piscine parfaite pour les enfants et les ruines à deux pas. Séjour inoubliable en famille.'),
  ('10000000-0000-4000-b000-000005000003','10000000-0000-4000-b000-000004000003',
   '10000000-0000-4000-b000-000000000105','00000000-0000-4000-a000-000000000004',
   'property','pending',4,4,4,5,5,4,4,
   'Maison pleine de charme au cœur de Constantine. Accueil chaleureux et petit-déjeuner délicieux.'),
  ('10000000-0000-4000-b000-000005000004','10000000-0000-4000-b000-000004000004',
   '10000000-0000-4000-b000-000000000107','00000000-0000-4000-a000-000000000001',
   'property','pending',5,4,5,5,5,5,4,
   'Une nuit magique sous les étoiles du Hoggar. L''équipe touareg était formidable. Expérience à vivre absolument.'),
  ('10000000-0000-4000-b000-000005000005','10000000-0000-4000-b000-000004000005',
   '10000000-0000-4000-b000-000000000112','00000000-0000-4000-a000-000000000004',
   'property','pending',4,5,4,4,5,4,5,
   'Hôtel bien situé en plein centre d''Alger. Chambre propre et personnel professionnel. Bon rapport qualité-prix.');

-- Publish (trigger reviews_stamp_published sets published_at; rating trigger fires).
update public.reviews set status = 'published'
 where id in (
   '10000000-0000-4000-b000-000005000001','10000000-0000-4000-b000-000005000002',
   '10000000-0000-4000-b000-000005000003','10000000-0000-4000-b000-000005000004',
   '10000000-0000-4000-b000-000005000005');
