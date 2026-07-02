-- Harden profile updates so non-privileged users cannot escalate role
-- or self-assign business units by calling PostgREST directly.

create or replace function public.enforce_profile_update_restrictions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Admin/RRHH keep full update capabilities.
  if public.has_full_access() then
    return new;
  end if;

  -- Non-privileged users can only update their own profile.
  if old.id <> auth.uid() then
    raise exception 'No autorizado para actualizar este perfil';
  end if;

  -- Prevent privilege escalation and unit reassignment.
  if new.role is distinct from old.role then
    raise exception 'No autorizado para cambiar el rol';
  end if;

  if new.business_unit_ids is distinct from old.business_unit_ids then
    raise exception 'No autorizado para cambiar unidades de negocio';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_restrict_updates on public.profiles;
create trigger trg_profiles_restrict_updates
before update on public.profiles
for each row
execute function public.enforce_profile_update_restrictions();
