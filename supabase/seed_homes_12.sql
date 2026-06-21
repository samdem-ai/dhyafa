-- ===========================================================================
-- 12 vacation homes across 12 distinct wilayas (P9 demo content).
-- Single-unit listings owned by the individual host (host_profile …001),
-- APPROVED + published so they show in search immediately. Photos are absolute
-- Unsplash URLs (rendered via the photo-URL passthrough — no storage upload).
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING, safe to re-run.
-- Property ids 301-312, room_type ids 401-412, photo ids 000004……
-- ===========================================================================

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
  ('10000000-0000-4000-b000-000000000301','10000000-0000-4000-b000-000000000001',7,'single_unit',
   'شاليه جبلي في تيزي وزو بإطلالة على جرجرة','Chalet de montagne à Tizi Ouzou vue sur le Djurdjura','Mountain chalet in Tizi Ouzou with Djurdjura view',
   'شاليه خشبي دافئ في قلب منطقة القبائل، محاط بالغابات وإطلالة على قمم جرجرة. مثالي للاستجمام والمشي في الطبيعة.',
   'Chalet en bois chaleureux au cœur de la Kabylie, entouré de forêts avec vue sur les cimes du Djurdjura. Idéal pour se ressourcer et randonner.',
   'Cozy wooden chalet in the heart of Kabylie, surrounded by forest with views of the Djurdjura peaks. Ideal for unwinding and hiking.',
   'approved',15,1501,'Route de Tikjda, Tizi Ouzou',36.716900,4.049700,'moderate','14:00','11:00',
   'ممنوع التدخين بالداخل. هدوء بعد 11 ليلاً.','Non-fumeur. Calme après 23h.','No smoking indoors. Quiet after 11pm.',
   true,2,30,'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1200',
   now()-interval '32 days',now()-interval '31 days','00000000-0000-4000-a000-000000000005',now()-interval '31 days'),

  ('10000000-0000-4000-b000-000000000302','10000000-0000-4000-b000-000000000001',1,'single_unit',
   'شقة بإطلالة بحرية في بجاية','Appartement vue mer à Béjaïa','Sea-view apartment in Bejaia',
   'شقة مشرقة فوق خليج بجاية، قريبة من كاب كاربون والكورنيش. انطلق لاكتشاف الساحل والمرتفعات.',
   'Appartement lumineux au-dessus de la baie de Béjaïa, proche du Cap Carbon et de la corniche. Point de départ idéal pour la côte et les hauteurs.',
   'Bright apartment above the Bay of Bejaia, near Cap Carbon and the corniche. A perfect base for the coast and the highlands.',
   'approved',6,601,'Boulevard de la Liberté, Béjaïa',36.750900,5.056700,'flexible','15:00','11:00',
   'ممنوع الحفلات.','Pas de fêtes.','No parties.',
   false,1,21,'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
   now()-interval '30 days',now()-interval '29 days','00000000-0000-4000-a000-000000000005',now()-interval '29 days'),

  ('10000000-0000-4000-b000-000000000303','10000000-0000-4000-b000-000000000001',2,'single_unit',
   'فيلا قرب الشاطئ في عنابة','Villa près de la plage à Annaba','Beachfront villa in Annaba',
   'فيلا واسعة بحديقة على بعد دقائق من شواطئ عنابة وآثار هيبون. مناسبة للعائلات الكبيرة في الصيف.',
   'Grande villa avec jardin à quelques minutes des plages d''Annaba et des vestiges d''Hippone. Parfaite pour les grandes familles en été.',
   'Spacious villa with garden, minutes from Annaba''s beaches and the ruins of Hippo. Great for large families in summer.',
   'approved',23,2301,'Route de la Corniche, Annaba',36.900000,7.766700,'strict','15:00','12:00',
   'احترام الجيران. ممنوع الحفلات الصاخبة.','Respect du voisinage. Pas de fêtes bruyantes.','Respect neighbors. No loud parties.',
   true,2,30,'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200',
   now()-interval '28 days',now()-interval '27 days','00000000-0000-4000-a000-000000000005',now()-interval '27 days'),

  ('10000000-0000-4000-b000-000000000304','10000000-0000-4000-b000-000000000001',1,'single_unit',
   'شقة وسط قسنطينة قرب الجسور المعلقة','Appartement au centre de Constantine près des ponts','Apartment in central Constantine near the bridges',
   'شقة أنيقة في مدينة الجسور المعلقة، على مقربة من قصر أحمد باي والمدينة القديمة. تجربة حضرية أصيلة.',
   'Appartement élégant dans la ville des ponts suspendus, proche du Palais Ahmed Bey et de la vieille ville. Une expérience urbaine authentique.',
   'Elegant apartment in the city of suspended bridges, near the Ahmed Bey Palace and the old town. An authentic city stay.',
   'approved',25,2501,'Rue Didouche Mourad, Constantine',36.365000,6.614700,'moderate','14:00','11:00',
   'ممنوع التدخين بالداخل.','Non-fumeur à l''intérieur.','No smoking indoors.',
   false,1,28,'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200',
   now()-interval '26 days',now()-interval '25 days','00000000-0000-4000-a000-000000000005',now()-interval '25 days'),

  ('10000000-0000-4000-b000-000000000305','10000000-0000-4000-b000-000000000001',1,'single_unit',
   'شقة عصرية بوسط سطيف','Appartement moderne au centre de Sétif','Modern apartment in central Setif',
   'شقة حديثة قرب عين الفوارة والحديقة، مثالية للأعمال والعائلات الزائرة للهضاب العليا.',
   'Appartement récent près d''Aïn El Fouara et du parc, idéal pour les affaires et les familles visitant les Hauts-Plateaux.',
   'Recently built apartment near Aïn El Fouara and the park, ideal for business and families visiting the High Plateaus.',
   'approved',19,1901,'Avenue du 8 Mai 1945, Sétif',36.189800,5.410800,'flexible','14:00','11:00',
   'هدوء بعد 11 ليلاً.','Calme après 23h.','Quiet after 11pm.',
   true,1,30,'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200',
   now()-interval '24 days',now()-interval '23 days','00000000-0000-4000-a000-000000000005',now()-interval '23 days'),

  ('10000000-0000-4000-b000-000000000306','10000000-0000-4000-b000-000000000001',6,'single_unit',
   'دار ضيافة قرب آثار تيمقاد بباتنة','Maison d''hôtes près de Timgad à Batna','Guesthouse near Timgad in Batna',
   'دار ضيافة تقليدية على مشارف الأوراس، قاعدة مثالية لزيارة تيمقاد ومناظر جبال الأوراس.',
   'Maison d''hôtes traditionnelle aux portes des Aurès, base idéale pour visiter Timgad et les paysages de l''Aurès.',
   'Traditional guesthouse at the gateway to the Aurès, an ideal base for visiting Timgad and the Aurès landscapes.',
   'approved',5,501,'Route de Timgad, Batna',35.555000,6.174100,'moderate','13:00','11:00',
   'احترام عادات المكان.','Respect des lieux.','Respect the house customs.',
   false,1,21,'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200',
   now()-interval '22 days',now()-interval '21 days','00000000-0000-4000-a000-000000000005',now()-interval '21 days'),

  ('10000000-0000-4000-b000-000000000307','10000000-0000-4000-b000-000000000001',3,'single_unit',
   'رياض تقليدي في غرداية بوادي ميزاب','Riad traditionnel à Ghardaïa dans le M''Zab','Traditional riad in Ghardaia (M''Zab)',
   'رياض من العمارة المزابية الأصيلة في قلب وادي ميزاب المصنّف عالمياً، أفنية هادئة وأسقف للسهر تحت النجوم.',
   'Riad d''architecture mozabite authentique au cœur de la vallée du M''Zab (patrimoine mondial), patios paisibles et terrasses sous les étoiles.',
   'Authentic Mozabite-architecture riad in the heart of the UNESCO M''Zab valley, with peaceful patios and rooftop terraces under the stars.',
   'approved',47,4701,'Vieux Ksar, Ghardaïa',32.490000,3.670000,'strict','14:00','12:00',
   'لباس محتشم في الأماكن المشتركة.','Tenue correcte dans les espaces communs.','Modest dress in shared spaces.',
   true,2,30,'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=1200',
   now()-interval '20 days',now()-interval '19 days','00000000-0000-4000-a000-000000000005',now()-interval '19 days'),

  ('10000000-0000-4000-b000-000000000308','10000000-0000-4000-b000-000000000001',9,'single_unit',
   'مخيم صحراوي في الهقار بتمنراست','Campement saharien dans le Hoggar à Tamanrasset','Saharan camp in the Hoggar, Tamanrasset',
   'مخيم تحت سماء الهقار الصافية قرب الأسكرام، تجربة طوارقية أصيلة مع شروق لا يُنسى على القمم البركانية.',
   'Campement sous le ciel pur du Hoggar près de l''Assekrem, expérience touarègue authentique avec des levers de soleil inoubliables sur les pics volcaniques.',
   'Camp under the clear Hoggar sky near the Assekrem — an authentic Tuareg experience with unforgettable sunrises over the volcanic peaks.',
   'approved',11,1101,'Piste de l''Assekrem, Tamanrasset',22.785000,5.522800,'flexible','16:00','10:00',
   'احترام البيئة الصحراوية.','Respect de l''environnement désertique.','Respect the desert environment.',
   false,1,14,'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200',
   now()-interval '18 days',now()-interval '17 days','00000000-0000-4000-a000-000000000005',now()-interval '17 days'),

  ('10000000-0000-4000-b000-000000000309','10000000-0000-4000-b000-000000000001',9,'single_unit',
   'إقامة في قصر صحراوي بأدرار','Séjour dans un ksar saharien à Adrar','Stay in a Saharan ksar in Adrar',
   'إقامة في قصر طيني تقليدي بتوات، أجواء صحراوية أصيلة وجولات إلى الفقارات وكثبان الرمال الذهبية.',
   'Séjour dans un ksar en terre traditionnel du Touat, ambiance saharienne authentique et excursions vers les foggaras et les dunes dorées.',
   'Stay in a traditional earthen ksar of the Touat, with an authentic Saharan atmosphere and trips to the foggaras and golden dunes.',
   'approved',1,101,'Ksar de Timimoun, Adrar',27.874200,-0.293900,'moderate','15:00','11:00',
   'الحفاظ على هدوء المكان.','Préserver le calme des lieux.','Keep the place quiet.',
   true,1,21,'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200',
   now()-interval '16 days',now()-interval '15 days','00000000-0000-4000-a000-000000000005',now()-interval '15 days'),

  ('10000000-0000-4000-b000-000000000310','10000000-0000-4000-b000-000000000001',2,'single_unit',
   'فيلا أندلسية الطراز في تلمسان','Villa de style andalou à Tlemcen','Andalusian-style villa in Tlemcen',
   'فيلا بطابع أندلسي وحديقة زيتون، قرب منصورة وشلالات الأوريط. مدينة الفن والتاريخ بامتياز.',
   'Villa au charme andalou avec jardin d''oliviers, près de Mansourah et des cascades d''El Ourit. La ville d''art et d''histoire par excellence.',
   'Andalusian-charm villa with an olive garden, near Mansourah and the El Ourit waterfalls. The city of art and history at its best.',
   'approved',13,1301,'Route de Mansourah, Tlemcen',34.878300,-1.315000,'moderate','14:00','12:00',
   'ممنوع التدخين بالداخل.','Non-fumeur à l''intérieur.','No smoking indoors.',
   false,2,30,'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200',
   now()-interval '14 days',now()-interval '13 days','00000000-0000-4000-a000-000000000005',now()-interval '13 days'),

  ('10000000-0000-4000-b000-000000000311','10000000-0000-4000-b000-000000000001',2,'single_unit',
   'فيلا وسط واحة نخيل بورقلة','Villa dans une palmeraie à Ouargla','Villa in a palm grove in Ouargla',
   'فيلا هادئة وسط واحة نخيل، مسبح يقي حر الصحراء وأمسيات لطيفة تحت النخيل. بوابة الجنوب الشرقي.',
   'Villa paisible au milieu d''une palmeraie, piscine pour échapper à la chaleur et soirées douces sous les palmiers. La porte du Sud-Est.',
   'Quiet villa set in a palm grove, with a pool to escape the desert heat and pleasant evenings under the palms. Gateway to the south-east.',
   'approved',30,3001,'Route de Rouissat, Ouargla',31.949000,5.325000,'flexible','15:00','11:00',
   'ترشيد استهلاك الماء.','Usage raisonné de l''eau.','Use water sparingly.',
   true,1,21,'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
   now()-interval '12 days',now()-interval '11 days','00000000-0000-4000-a000-000000000005',now()-interval '11 days'),

  ('10000000-0000-4000-b000-000000000312','10000000-0000-4000-b000-000000000001',7,'single_unit',
   'بيت جبلي في الشريعة بالبليدة','Maison de montagne à Chréa, Blida','Mountain house in Chréa, Blida',
   'بيت دافئ في مرتفعات الشريعة وسط الأطلسي البليدي، هواء نقي وثلج شتاءً وغابات أرز. ملاذ قريب من العاصمة.',
   'Maison chaleureuse sur les hauteurs de Chréa, au cœur de l''Atlas blidéen : air pur, neige en hiver et forêts de cèdres. Une escapade proche d''Alger.',
   'Warm house on the heights of Chréa, in the Blida Atlas: fresh air, winter snow and cedar forests. A getaway close to Algiers.',
   'approved',9,901,'Route de Chréa, Blida',36.470000,2.830000,'moderate','14:00','11:00',
   'هدوء بعد 11 ليلاً.','Calme après 23h.','Quiet after 11pm.',
   true,2,30,'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200',
   now()-interval '10 days',now()-interval '9 days','00000000-0000-4000-a000-000000000005',now()-interval '9 days')
on conflict (id) do nothing;

-- One default room_type (entire place) per home.
insert into public.room_types
  (id, property_id, name_ar, name_fr, name_en, is_default,
   base_occupancy, max_occupancy, max_adults, max_children, bed_config,
   size_sqm, base_price_dzd, weekend_price_dzd, cleaning_fee_dzd,
   extra_guest_fee_dzd, inventory_count, is_active, sort_order)
values
  ('10000000-0000-4000-b000-000000000401','10000000-0000-4000-b000-000000000301','المسكن بأكمله','Logement entier','Entire place',true,2,6,4,2,'[{"type":"double","count":2},{"type":"single","count":2}]'::jsonb,110,9000,11000,2000,1200,1,true,0),
  ('10000000-0000-4000-b000-000000000402','10000000-0000-4000-b000-000000000302','المسكن بأكمله','Logement entier','Entire place',true,2,4,3,1,'[{"type":"double","count":1},{"type":"sofa","count":1}]'::jsonb,80,8500,10000,1800,1200,1,true,0),
  ('10000000-0000-4000-b000-000000000403','10000000-0000-4000-b000-000000000303','المسكن بأكمله','Logement entier','Entire place',true,4,8,6,2,'[{"type":"double","count":3},{"type":"single","count":2}]'::jsonb,180,14000,17000,3000,1500,1,true,0),
  ('10000000-0000-4000-b000-000000000404','10000000-0000-4000-b000-000000000304','المسكن بأكمله','Logement entier','Entire place',true,2,4,4,2,'[{"type":"double","count":1},{"type":"single","count":2}]'::jsonb,75,7500,9000,1800,1200,1,true,0),
  ('10000000-0000-4000-b000-000000000405','10000000-0000-4000-b000-000000000305','المسكن بأكمله','Logement entier','Entire place',true,2,4,3,1,'[{"type":"double","count":1},{"type":"sofa","count":1}]'::jsonb,70,6500,8000,1500,1000,1,true,0),
  ('10000000-0000-4000-b000-000000000406','10000000-0000-4000-b000-000000000306','المسكن بأكمله','Logement entier','Entire place',true,2,5,4,2,'[{"type":"double","count":1},{"type":"single","count":3}]'::jsonb,95,7000,8500,1800,1000,1,true,0),
  ('10000000-0000-4000-b000-000000000407','10000000-0000-4000-b000-000000000307','المسكن بأكمله','Logement entier','Entire place',true,2,6,4,2,'[{"type":"double","count":2},{"type":"floor_mattress","count":2}]'::jsonb,120,9500,11500,2200,1300,1,true,0),
  ('10000000-0000-4000-b000-000000000408','10000000-0000-4000-b000-000000000308','الخيمة بأكملها','Tente entière','Entire tent',true,2,4,4,0,'[{"type":"floor_mattress","count":4}]'::jsonb,40,11000,12000,1500,1500,1,true,0),
  ('10000000-0000-4000-b000-000000000409','10000000-0000-4000-b000-000000000309','المسكن بأكمله','Logement entier','Entire place',true,2,5,4,1,'[{"type":"double","count":1},{"type":"floor_mattress","count":3}]'::jsonb,90,8000,9500,1500,1200,1,true,0),
  ('10000000-0000-4000-b000-000000000410','10000000-0000-4000-b000-000000000310','المسكن بأكمله','Logement entier','Entire place',true,4,7,5,2,'[{"type":"double","count":2},{"type":"single","count":3}]'::jsonb,160,12000,14500,2800,1400,1,true,0),
  ('10000000-0000-4000-b000-000000000411','10000000-0000-4000-b000-000000000311','المسكن بأكمله','Logement entier','Entire place',true,4,6,4,2,'[{"type":"double","count":2},{"type":"single","count":2}]'::jsonb,140,9000,11000,2500,1300,1,true,0),
  ('10000000-0000-4000-b000-000000000412','10000000-0000-4000-b000-000000000312','المسكن بأكمله','Logement entier','Entire place',true,2,6,4,2,'[{"type":"double","count":2},{"type":"single","count":2}]'::jsonb,100,8500,10500,2000,1200,1,true,0)
on conflict (id) do nothing;

-- 3 photos per home (cover + 2). Absolute Unsplash URLs (render via passthrough).
insert into public.property_photos (id, property_id, storage_path, alt_en, sort_order, is_cover)
values
  ('10000000-0000-4000-b000-000004030101','10000000-0000-4000-b000-000000000301','https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1200','Chalet exterior',0,true),
  ('10000000-0000-4000-b000-000004030102','10000000-0000-4000-b000-000000000301','https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200','Bedroom',1,false),
  ('10000000-0000-4000-b000-000004030103','10000000-0000-4000-b000-000000000301','https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=1200','Kitchen',2,false),
  ('10000000-0000-4000-b000-000004030201','10000000-0000-4000-b000-000000000302','https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200','Living room',0,true),
  ('10000000-0000-4000-b000-000004030202','10000000-0000-4000-b000-000000000302','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200','Balcony',1,false),
  ('10000000-0000-4000-b000-000004030203','10000000-0000-4000-b000-000000000302','https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200','Bedroom',2,false),
  ('10000000-0000-4000-b000-000004030301','10000000-0000-4000-b000-000000000303','https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200','Villa exterior',0,true),
  ('10000000-0000-4000-b000-000004030302','10000000-0000-4000-b000-000000000303','https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=1200','Master bedroom',1,false),
  ('10000000-0000-4000-b000-000004030303','10000000-0000-4000-b000-000000000303','https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=1200','Kitchen',2,false),
  ('10000000-0000-4000-b000-000004030401','10000000-0000-4000-b000-000000000304','https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200','Living room',0,true),
  ('10000000-0000-4000-b000-000004030402','10000000-0000-4000-b000-000000000304','https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200','Bedroom',1,false),
  ('10000000-0000-4000-b000-000004030403','10000000-0000-4000-b000-000000000304','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200','Balcony',2,false),
  ('10000000-0000-4000-b000-000004030501','10000000-0000-4000-b000-000000000305','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200','Modern interior',0,true),
  ('10000000-0000-4000-b000-000004030502','10000000-0000-4000-b000-000000000305','https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200','Bedroom',1,false),
  ('10000000-0000-4000-b000-000004030503','10000000-0000-4000-b000-000000000305','https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=1200','Kitchen',2,false),
  ('10000000-0000-4000-b000-000004030601','10000000-0000-4000-b000-000000000306','https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200','Guesthouse',0,true),
  ('10000000-0000-4000-b000-000004030602','10000000-0000-4000-b000-000000000306','https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=1200','Bedroom',1,false),
  ('10000000-0000-4000-b000-000004030603','10000000-0000-4000-b000-000000000306','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200','Courtyard',2,false),
  ('10000000-0000-4000-b000-000004030701','10000000-0000-4000-b000-000000000307','https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=1200','Riad patio',0,true),
  ('10000000-0000-4000-b000-000004030702','10000000-0000-4000-b000-000000000307','https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200','Bedroom',1,false),
  ('10000000-0000-4000-b000-000004030703','10000000-0000-4000-b000-000000000307','https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200','Rooftop terrace',2,false),
  ('10000000-0000-4000-b000-000004030801','10000000-0000-4000-b000-000000000308','https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200','Desert camp',0,true),
  ('10000000-0000-4000-b000-000004030802','10000000-0000-4000-b000-000000000308','https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200','Dunes',1,false),
  ('10000000-0000-4000-b000-000004030803','10000000-0000-4000-b000-000000000308','https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=1200','Tent interior',2,false),
  ('10000000-0000-4000-b000-000004030901','10000000-0000-4000-b000-000000000309','https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200','Golden dunes',0,true),
  ('10000000-0000-4000-b000-000004030902','10000000-0000-4000-b000-000000000309','https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200','Ksar at dusk',1,false),
  ('10000000-0000-4000-b000-000004030903','10000000-0000-4000-b000-000000000309','https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=1200','Room',2,false),
  ('10000000-0000-4000-b000-000004031001','10000000-0000-4000-b000-000000000310','https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200','Villa',0,true),
  ('10000000-0000-4000-b000-000004031002','10000000-0000-4000-b000-000000000310','https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200','Bedroom',1,false),
  ('10000000-0000-4000-b000-000004031003','10000000-0000-4000-b000-000000000310','https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=1200','Kitchen',2,false),
  ('10000000-0000-4000-b000-000004031101','10000000-0000-4000-b000-000000000311','https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200','Villa room',0,true),
  ('10000000-0000-4000-b000-000004031102','10000000-0000-4000-b000-000000000311','https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200','Pool',1,false),
  ('10000000-0000-4000-b000-000004031103','10000000-0000-4000-b000-000000000311','https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=1200','Kitchen',2,false),
  ('10000000-0000-4000-b000-000004031201','10000000-0000-4000-b000-000000000312','https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200','Mountain house',0,true),
  ('10000000-0000-4000-b000-000004031202','10000000-0000-4000-b000-000000000312','https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200','Bedroom',1,false),
  ('10000000-0000-4000-b000-000004031203','10000000-0000-4000-b000-000000000312','https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=1200','Kitchen',2,false)
on conflict (id) do nothing;

-- A handful of amenities per home (wifi/ac/tv/kitchen/parking + a flavour one).
insert into public.property_amenities (property_id, amenity_id)
select p.id::uuid, a.aid from (values
  ('10000000-0000-4000-b000-000000000301'),('10000000-0000-4000-b000-000000000302'),
  ('10000000-0000-4000-b000-000000000303'),('10000000-0000-4000-b000-000000000304'),
  ('10000000-0000-4000-b000-000000000305'),('10000000-0000-4000-b000-000000000306'),
  ('10000000-0000-4000-b000-000000000307'),('10000000-0000-4000-b000-000000000308'),
  ('10000000-0000-4000-b000-000000000309'),('10000000-0000-4000-b000-000000000310'),
  ('10000000-0000-4000-b000-000000000311'),('10000000-0000-4000-b000-000000000312')
) as p(id)
cross join (values (1),(2),(4),(12),(13)) as a(aid)
on conflict do nothing;
-- (p.id from a VALUES list is text → cast to uuid for the FK column.)

-- Per-home signature amenities (parking/pool/terrace/garden/sea_view).
insert into public.property_amenities (property_id, amenity_id) values
  ('10000000-0000-4000-b000-000000000301',9),('10000000-0000-4000-b000-000000000301',6),
  ('10000000-0000-4000-b000-000000000302',10),('10000000-0000-4000-b000-000000000302',8),
  ('10000000-0000-4000-b000-000000000303',7),('10000000-0000-4000-b000-000000000303',9),('10000000-0000-4000-b000-000000000303',10),
  ('10000000-0000-4000-b000-000000000304',6),
  ('10000000-0000-4000-b000-000000000305',6),
  ('10000000-0000-4000-b000-000000000306',9),('10000000-0000-4000-b000-000000000306',6),
  ('10000000-0000-4000-b000-000000000307',8),
  ('10000000-0000-4000-b000-000000000309',6),
  ('10000000-0000-4000-b000-000000000310',9),('10000000-0000-4000-b000-000000000310',7),
  ('10000000-0000-4000-b000-000000000311',7),('10000000-0000-4000-b000-000000000311',9),('10000000-0000-4000-b000-000000000311',6),
  ('10000000-0000-4000-b000-000000000312',9),('10000000-0000-4000-b000-000000000312',6)
on conflict do nothing;
