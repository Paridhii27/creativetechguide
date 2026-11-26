-- Relabel the spatial-xr discipline so AR/VR is easy to find (data only; the slug and existing tags are unchanged).
update disciplines set label = 'AR/VR & Spatial' where slug = 'spatial-xr';
