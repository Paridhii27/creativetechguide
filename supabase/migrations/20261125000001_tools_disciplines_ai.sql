-- Broaden 'ai-art' to a general 'ai' discipline, and give tools a full discipline set.
-- Tools are digital and not place-based: no location, not remote/online. Data only; safe to re-run.

insert into disciplines (slug, label, sort_order) values ('ai', 'AI', 7)
on conflict (slug) do update set label = excluded.label, sort_order = excluded.sort_order;

-- Move every entry from ai-art to ai (no duplicates if both were present), then drop ai-art.
update entries
   set disciplines = array(select d from unnest(array_replace(disciplines, 'ai-art', 'ai')) with ordinality as t(d, n) group by d order by min(n))
 where 'ai-art' = any (disciplines);
delete from disciplines where slug = 'ai-art';

update entries e
   set disciplines = v.disciplines
  from (values
  ('https://aframe.io', array['spatial-xr','web-development','3d-real-time','creative-coding','interaction-design','experience-design']),
  ('https://www.ableton.com/en/live/', array['sound-music-tech','installation','experience-design','production']),
  ('https://www.arduino.cc', array['physical-computing','interaction-design','installation','robotics','wearables-fashion-tech','design-engineering','product-design','creative-coding']),
  ('https://www.babylonjs.com', array['3d-real-time','web-development','spatial-xr','game-design','creative-coding','interaction-design']),
  ('https://bela.io', array['physical-computing','sound-music-tech','interaction-design','installation','design-engineering']),
  ('https://www.blender.org', array['3d-real-time','motion-design','technical-art','spatial-xr','generative-art','game-design','architecture-spatial','product-design']),
  ('https://cables.gl', array['creative-coding','generative-art','web-development','3d-real-time','motion-design','interaction-design','data-visualisation']),
  ('https://cavalry.scenegroup.co', array['motion-design','generative-art','graphic-design','data-visualisation']),
  ('https://benjamin.kuperberg.fr/chataigne', array['installation','production','interaction-design','physical-computing','projection-mapping','experience-design','sound-music-tech']),
  ('https://libcinder.org', array['creative-coding','installation','generative-art','3d-real-time','interaction-design','data-visualisation','experience-design']),
  ('https://www.comfy.org', array['ai','machine-learning','generative-art','motion-design','graphic-design','technical-art']),
  ('https://www.disguise.one', array['projection-mapping','production','installation','3d-real-time','experience-design','spatial-xr']),
  ('https://fritzing.org', array['physical-computing','design-engineering','product-design','wearables-fashion-tech']),
  ('https://godotengine.org', array['game-design','3d-real-time','interaction-design','spatial-xr','technical-art','creative-coding']),
  ('https://www.sidefx.com', array['3d-real-time','technical-art','generative-art','motion-design','spatial-xr','architecture-spatial']),
  ('https://huggingface.co', array['ai','machine-learning','research','creative-coding']),
  ('https://hydra.ojack.xyz', array['creative-coding','generative-art','motion-design','web-development','sound-music-tech']),
  ('https://troikatronix.com', array['installation','interaction-design','projection-mapping','experience-design','sound-music-tech','production']),
  ('https://www.kicad.org', array['physical-computing','design-engineering','product-design','robotics','wearables-fashion-tech']),
  ('https://hexler.net/kodelife', array['creative-coding','generative-art','3d-real-time','technical-art','motion-design']),
  ('https://ar.snap.com/lens-studio', array['spatial-xr','interaction-design','3d-real-time','ai','motion-design','technical-art','experience-design']),
  ('https://madmapper.com', array['projection-mapping','installation','experience-design','production','architecture-spatial']),
  ('https://magenta.withgoogle.com', array['ai','machine-learning','sound-music-tech','creative-coding','research']),
  ('https://cycling74.com', array['sound-music-tech','creative-coding','interaction-design','installation','physical-computing','generative-art','experience-design']),
  ('https://www.millumin.com', array['projection-mapping','installation','experience-design','production','interaction-design']),
  ('https://ml5js.org', array['ai','machine-learning','creative-coding','interaction-design','web-development']),
  ('https://nodered.org', array['physical-computing','design-engineering','installation','interaction-design','robotics']),
  ('https://www.notch.one', array['3d-real-time','motion-design','installation','projection-mapping','experience-design','generative-art','production']),
  ('https://openframeworks.cc', array['creative-coding','installation','generative-art','interaction-design','3d-real-time','physical-computing','data-visualisation','sound-music-tech']),
  ('https://ossia.io', array['installation','sound-music-tech','interaction-design','production','experience-design','physical-computing']),
  ('https://p5js.org', array['creative-coding','generative-art','interaction-design','data-visualisation','web-development','graphic-design']),
  ('https://pixera.one', array['projection-mapping','installation','production','experience-design','3d-real-time']),
  ('https://playcanvas.com', array['3d-real-time','web-development','game-design','spatial-xr','interaction-design']),
  ('https://processing.org', array['creative-coding','generative-art','interaction-design','data-visualisation','graphic-design','physical-computing','installation']),
  ('https://www.protopie.io', array['interaction-design','ui-ux-design','product-design','design-engineering','physical-computing']),
  ('https://puredata.info', array['sound-music-tech','creative-coding','interaction-design','installation','physical-computing','generative-art']),
  ('https://www.raspberrypi.com', array['physical-computing','installation','robotics','design-engineering','interaction-design','product-design']),
  ('https://resolume.com', array['projection-mapping','installation','motion-design','experience-design','production','sound-music-tech']),
  ('https://www.rhino3d.com', array['architecture-spatial','generative-art','product-design','3d-real-time','design-engineering','wearables-fashion-tech']),
  ('https://rive.app', array['motion-design','ui-ux-design','interaction-design','game-design','web-development','product-design']),
  ('https://runwayml.com', array['ai','machine-learning','motion-design','generative-art','graphic-design','creative-direction']),
  ('https://sonic-pi.net', array['sound-music-tech','creative-coding','generative-art']),
  ('https://spline.design', array['3d-real-time','ui-ux-design','interaction-design','web-development','motion-design','product-design']),
  ('https://strudel.cc', array['sound-music-tech','creative-coding','generative-art','web-development']),
  ('https://supercollider.github.io', array['sound-music-tech','creative-coding','generative-art','installation','research']),
  ('https://teachablemachine.withgoogle.com', array['ai','machine-learning','interaction-design','creative-coding','physical-computing']),
  ('https://www.pjrc.com/teensy/', array['physical-computing','sound-music-tech','interaction-design','installation','wearables-fashion-tech','design-engineering']),
  ('https://threejs.org', array['3d-real-time','creative-coding','web-development','spatial-xr','generative-art','interaction-design','data-visualisation','experience-design']),
  ('https://tidalcycles.org', array['sound-music-tech','creative-coding','generative-art']),
  ('https://tonejs.github.io', array['sound-music-tech','web-development','creative-coding','interaction-design']),
  ('https://derivative.ca', array['creative-coding','projection-mapping','installation','generative-art','interaction-design','3d-real-time','experience-design','data-visualisation','sound-music-tech','physical-computing','ai']),
  ('https://unity.com', array['game-design','3d-real-time','spatial-xr','interaction-design','installation','technical-art','experience-design','ai']),
  ('https://www.unrealengine.com', array['3d-real-time','game-design','spatial-xr','technical-art','installation','experience-design','production','architecture-spatial']),
  ('https://visualprogramming.net', array['creative-coding','installation','generative-art','interaction-design','3d-real-time','projection-mapping','experience-design']),
  ('http://www.wekinator.org', array['ai','machine-learning','interaction-design','sound-music-tech','physical-computing','research'])
  ) as v(url, disciplines)
 where e.url = v.url and e.type = 'resource' and e.data ->> 'resource_kind' = 'tool';

update entries
   set is_remote = false, city = null, state = null, country = null, region = null, lat = null, lng = null,
       data = data - 'locations'
 where type = 'resource' and data ->> 'resource_kind' = 'tool';
