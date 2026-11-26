-- Title Case for every discipline label, "Production & project management" becomes "Production Design" (slug and
-- existing tags unchanged), and a new management discipline.
update disciplines d set label = v.label
  from (values
    ('experience-design', 'Experience Design'),
    ('creative-coding', 'Creative Coding'),
    ('interaction-design', 'Interaction Design'),
    ('spatial-xr', 'AR/VR & Spatial'),
    ('installation', 'Installation'),
    ('projection-mapping', 'Projection Mapping'),
    ('ai', 'AI'),
    ('sound-music-tech', 'Sound & Music Tech'),
    ('generative-art', 'Generative Art'),
    ('physical-computing', 'Physical Computing'),
    ('game-design', 'Game Design'),
    ('data-visualisation', 'Data Visualisation'),
    ('service-design', 'Service Design'),
    ('research', 'Research'),
    ('ui-ux-design', 'UI/UX Design'),
    ('product-design', 'Product Design'),
    ('design-engineering', 'Design Engineering'),
    ('motion-design', 'Motion Design & Animation'),
    ('3d-real-time', '3D & Real-Time Graphics'),
    ('technical-art', 'Technical Art'),
    ('creative-direction', 'Creative Direction'),
    ('web-development', 'Web & Front-End Development'),
    ('graphic-design', 'Graphic & Visual Design'),
    ('robotics', 'Robotics'),
    ('machine-learning', 'Machine Learning'),
    ('architecture-spatial', 'Architecture & Spatial Design'),
    ('wearables-fashion-tech', 'Wearables & Fashion Tech'),
    ('production', 'Production Design')
  ) as v(slug, label)
 where d.slug = v.slug;

insert into disciplines (slug, label, sort_order)
values ('creative-tech-management', 'Creative Technology Management', 29)
on conflict (slug) do nothing;
