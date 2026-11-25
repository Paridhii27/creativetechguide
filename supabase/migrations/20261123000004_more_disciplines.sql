-- More creative-technology roles and fields in the discipline taxonomy (data only; safe to re-run).
insert into disciplines (slug, label, sort_order) values
  ('ui-ux-design', 'UI/UX design', 15),
  ('product-design', 'Product design', 16),
  ('design-engineering', 'Design engineering', 17),
  ('motion-design', 'Motion design & animation', 18),
  ('3d-real-time', '3D & real-time graphics', 19),
  ('technical-art', 'Technical art', 20),
  ('creative-direction', 'Creative direction', 21),
  ('web-development', 'Web & front-end development', 22),
  ('graphic-design', 'Graphic & visual design', 23),
  ('robotics', 'Robotics', 24),
  ('machine-learning', 'Machine learning', 25),
  ('architecture-spatial', 'Architecture & spatial design', 26),
  ('wearables-fashion-tech', 'Wearables & fashion tech', 27),
  ('production', 'Production & project management', 28)
on conflict (slug) do nothing;
