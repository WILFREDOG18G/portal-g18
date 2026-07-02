create table if not exists public.vacation_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  business_unit_id uuid not null references public.business_units(id),
  start_date date not null,
  end_date date not null,
  total_days int not null,
  reason text,
  status text not null default 'pendiente',
  created_at timestamptz not null default now(),
  constraint vacation_requests_status_check check (status in ('pendiente', 'aprobado', 'rechazado')),
  constraint vacation_requests_dates_check check (end_date >= start_date),
  constraint vacation_requests_total_days_check check (total_days > 0)
);

create index if not exists idx_vacation_requests_business_unit_dates
  on public.vacation_requests (business_unit_id, start_date, end_date);

create index if not exists idx_vacation_requests_employee_id
  on public.vacation_requests (employee_id);

alter table public.vacation_requests enable row level security;

create policy vacation_requests_rw_policy on public.vacation_requests
for all
using (public.can_access_business_unit(business_unit_id))
with check (public.can_access_business_unit(business_unit_id));

create policy admin_delete_vacation_requests_policy on public.vacation_requests
for delete
using (public.has_full_access());
