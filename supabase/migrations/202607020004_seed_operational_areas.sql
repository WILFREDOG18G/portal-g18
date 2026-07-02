-- Ensure operational areas requested by RRHH are available in every business unit.

alter table public.areas
  drop constraint if exists areas_name_check;

alter table public.areas
  add constraint areas_name_check
  check (
    name in (
      'Servicio',
      'Cocina',
      'Admin',
      'Corporativo',
      'Sushi',
      'Bar',
      'Kosher',
      'Documento'
    )
  );

insert into public.areas (business_unit_id, name)
select bu.id, requested.name
from public.business_units bu
cross join (
  values
    ('Servicio'::text),
    ('Cocina'::text),
    ('Admin'::text),
    ('Corporativo'::text)
) as requested(name)
on conflict (business_unit_id, name) do nothing;
