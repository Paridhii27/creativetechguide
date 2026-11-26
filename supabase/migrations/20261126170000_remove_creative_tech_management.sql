-- Remove the management discipline added in 20261126161006 (no entry used it).
delete from disciplines
 where slug = 'creative-tech-management'
   and not exists (select 1 from entries where 'creative-tech-management' = any (disciplines));
