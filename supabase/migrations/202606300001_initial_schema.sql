-- Portal G18 - Initial schema based on section 4 of PORTAL_G18_SPEC.md
-- Run this in Supabase SQL editor or via supabase migration tooling.

create extension if not exists "pgcrypto";

-- ----------
-- Catalog tables
-- ----------

create table if not exists public.business_units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  razon_social text not null,
  ruc text,
  logo_color text,
  kosher_type text,
  constraint business_units_name_check
    check (name in ('ARIA', 'KAVA', 'SIMJATI', 'SHEVA_CATERING')),
  constraint business_units_kosher_type_check
    check (kosher_type in ('carnico', 'lacteo') or kosher_type is null)
);

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references public.business_units(id) on delete cascade,
  name text not null,
  color text,
  unique (business_unit_id, name),
  constraint areas_name_check
    check (name in ('Servicio', 'Sushi', 'Cocina', 'Bar', 'Kosher'))
);

create table if not exists public.incident_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true
);

-- ----------
-- Core domain tables
-- ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null,
  role text not null,
  business_unit_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('admin', 'rrhh', 'manager'))
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  business_unit_id uuid not null references public.business_units(id),
  area_id uuid references public.areas(id),
  position text not null,
  status text not null default 'activo',
  contract_type text not null,
  identification_number text,
  work_permit text,
  salary numeric(12,2),
  hire_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employees_status_check check (status in ('activo', 'inactivo')),
  constraint employees_contract_type_check check (contract_type in ('SIPE', 'SP'))
);

create table if not exists public.quiz_banks (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references public.business_units(id) on delete cascade,
  area_id uuid not null references public.areas(id) on delete cascade,
  question_text text not null,
  options jsonb not null,
  correct_index int not null,
  explanation text,
  category text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quiz_banks_category_check check (category in ('precio', 'gastronomico')),
  constraint quiz_banks_correct_index_check check (correct_index >= 0),
  constraint quiz_banks_options_check check (jsonb_typeof(options) = 'array')
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  business_unit_id uuid not null references public.business_units(id),
  area_id uuid references public.areas(id),
  quiz_type text not null,
  total_questions int not null,
  correct_answers int not null,
  attempt_number int not null,
  taken_at timestamptz not null default now(),
  tip_percentage numeric(5,2),
  registered_by uuid references public.profiles(id),
  constraint quiz_attempts_total_questions_check check (total_questions > 0),
  constraint quiz_attempts_correct_answers_check check (correct_answers >= 0 and correct_answers <= total_questions),
  constraint quiz_attempts_attempt_number_check check (attempt_number between 1 and 5)
);

create table if not exists public.tips_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  business_unit_id uuid not null references public.business_units(id),
  shift text not null,
  amount numeric(12,2) not null,
  date date not null,
  notes text,
  registered_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint tips_records_shift_check check (shift in ('almuerzo', 'cena', 'completo')),
  constraint tips_records_amount_check check (amount >= 0)
);

create table if not exists public.petty_cash_records (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references public.business_units(id),
  category text not null,
  amount numeric(12,2) not null,
  description text,
  responsible text,
  date date not null,
  created_at timestamptz not null default now(),
  constraint petty_cash_records_amount_check check (amount >= 0)
);

create table if not exists public.temp_staff_records (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  business_unit_id uuid not null references public.business_units(id),
  area_id uuid references public.areas(id),
  event_type text not null,
  event_date date not null,
  start_time time,
  end_time time,
  hourly_rate numeric(12,2) not null,
  hours_calculated numeric(6,2),
  total_amount numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  constraint temp_staff_records_hourly_rate_check check (hourly_rate >= 0)
);

create table if not exists public.payroll_incidents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  business_unit_id uuid not null references public.business_units(id),
  pay_period text not null,
  month int not null,
  year int not null,
  incident_type text not null,
  quantity numeric(10,2),
  notes text,
  created_at timestamptz not null default now(),
  constraint payroll_incidents_pay_period_check check (pay_period in ('1-15', '16-fin')),
  constraint payroll_incidents_month_check check (month between 1 and 12)
);

create table if not exists public.loan_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  business_unit_id uuid not null references public.business_units(id),
  amount numeric(12,2) not null,
  installment_amount numeric(12,2) not null,
  installments_count int not null,
  last_installment_amount numeric(12,2),
  reason text,
  request_date date not null default current_date,
  approved_amount numeric(12,2),
  status text not null default 'pendiente',
  created_at timestamptz not null default now(),
  constraint loan_requests_status_check check (status in ('pendiente', 'aprobado', 'rechazado')),
  constraint loan_requests_installment_amount_check check (installment_amount in (50, 100)),
  constraint loan_requests_amount_check check (amount > 0),
  constraint loan_requests_installments_count_check check (installments_count >= 1)
);

create table if not exists public.work_letters (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  business_unit_id uuid not null references public.business_units(id),
  purpose text,
  request_date date not null default current_date,
  contract_type text not null,
  hire_date_text text,
  salary numeric(12,2),
  weekly_tip_avg numeric(12,2),
  identification text,
  status text not null default 'pendiente',
  generated_at timestamptz,
  generated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint work_letters_status_check check (status in ('pendiente', 'en_proceso', 'entregada')),
  constraint work_letters_contract_type_check check (contract_type in ('SP', 'SIPE'))
);

create table if not exists public.memos (
  id uuid primary key default gen_random_uuid(),
  target_employee_id uuid references public.employees(id),
  business_unit_id uuid references public.business_units(id),
  memo_type text not null,
  subject text not null,
  body text not null,
  date date not null default current_date,
  status text,
  created_at timestamptz not null default now()
);

create table if not exists public.sop_documents (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid references public.business_units(id),
  area_id uuid references public.areas(id),
  title text not null,
  description text,
  version text,
  file_url text not null,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ----------
-- Utility functions and triggers
-- ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

drop trigger if exists trg_quiz_banks_updated_at on public.quiz_banks;
create trigger trg_quiz_banks_updated_at
before update on public.quiz_banks
for each row execute function public.set_updated_at();

-- ----------
-- Indexes
-- ----------

create index if not exists idx_areas_business_unit_id on public.areas (business_unit_id);
create index if not exists idx_employees_business_unit_id on public.employees (business_unit_id);
create index if not exists idx_employees_area_id on public.employees (area_id);
create index if not exists idx_quiz_banks_bu_area on public.quiz_banks (business_unit_id, area_id);
create index if not exists idx_quiz_attempts_employee_id on public.quiz_attempts (employee_id);
create index if not exists idx_quiz_attempts_business_unit_id on public.quiz_attempts (business_unit_id);
create index if not exists idx_tips_records_business_unit_date on public.tips_records (business_unit_id, date);
create index if not exists idx_petty_cash_records_business_unit_date on public.petty_cash_records (business_unit_id, date);
create index if not exists idx_temp_staff_records_business_unit_date on public.temp_staff_records (business_unit_id, event_date);
create index if not exists idx_payroll_incidents_business_unit_period on public.payroll_incidents (business_unit_id, year, month, pay_period);
create index if not exists idx_loan_requests_employee_id on public.loan_requests (employee_id);
create index if not exists idx_work_letters_employee_id on public.work_letters (employee_id);
create index if not exists idx_memos_business_unit_id on public.memos (business_unit_id);
create index if not exists idx_sop_documents_business_unit_id on public.sop_documents (business_unit_id);

-- ----------
-- Seed required business units from section 1
-- ----------

insert into public.business_units (name, razon_social, ruc, logo_color, kosher_type)
values
  ('ARIA', 'GASTRONOMIA 18, S.A.', '155644704-2-2017 DV 70', '#2d5a3d', 'carnico'),
  ('KAVA', 'MANDARINA 18 IMPORT S.A', '19223675-1-726686 DV 71', '#8c2b2b', 'lacteo'),
  ('SIMJATI', 'LATAM ROBOTICS S.A', null, '#5b3d8a', null),
  ('SHEVA_CATERING', 'GASTRONOMIA 18, S.A.', null, '#b8922a', null)
on conflict (name) do update set
  razon_social = excluded.razon_social,
  ruc = excluded.ruc,
  logo_color = excluded.logo_color,
  kosher_type = excluded.kosher_type;

-- ----------
-- RLS helpers and policies
-- ----------

create or replace function public.current_profile_role()
returns text
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_profile_business_units()
returns uuid[]
language sql
stable
as $$
  select coalesce(business_unit_ids, '{}') from public.profiles where id = auth.uid()
$$;

create or replace function public.has_full_access()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'rrhh')
  )
$$;

create or replace function public.can_access_business_unit(target_business_unit_id uuid)
returns boolean
language sql
stable
as $$
  select
    public.has_full_access()
    or target_business_unit_id = any(public.current_profile_business_units())
$$;

alter table public.business_units enable row level security;
alter table public.areas enable row level security;
alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.quiz_banks enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.tips_records enable row level security;
alter table public.petty_cash_records enable row level security;
alter table public.temp_staff_records enable row level security;
alter table public.payroll_incidents enable row level security;
alter table public.loan_requests enable row level security;
alter table public.work_letters enable row level security;
alter table public.memos enable row level security;
alter table public.sop_documents enable row level security;
alter table public.incident_types enable row level security;

-- Profiles: each user can see self, admin/rrhh can see all
create policy profiles_select_policy on public.profiles
for select
using (id = auth.uid() or public.has_full_access());

create policy profiles_update_policy on public.profiles
for update
using (id = auth.uid() or public.has_full_access())
with check (id = auth.uid() or public.has_full_access());

create policy profiles_insert_self_policy on public.profiles
for insert
with check (
  id = auth.uid()
  and role = 'manager'
  and coalesce(array_length(business_unit_ids, 1), 0) = 0
);

-- Catalog visibility
create policy business_units_select_policy on public.business_units
for select
using (public.has_full_access() or id = any(public.current_profile_business_units()));

create policy areas_select_policy on public.areas
for select
using (public.can_access_business_unit(business_unit_id));

create policy incident_types_select_policy on public.incident_types
for select
using (true);

-- Generic business-unit scoped policies
create policy employees_select_policy on public.employees
for select
using (public.can_access_business_unit(business_unit_id));
create policy employees_insert_policy on public.employees
for insert
with check (public.can_access_business_unit(business_unit_id));
create policy employees_update_policy on public.employees
for update
using (public.can_access_business_unit(business_unit_id))
with check (public.can_access_business_unit(business_unit_id));

create policy quiz_banks_select_policy on public.quiz_banks
for select
using (public.can_access_business_unit(business_unit_id));
create policy quiz_banks_insert_policy on public.quiz_banks
for insert
with check (public.can_access_business_unit(business_unit_id));
create policy quiz_banks_update_policy on public.quiz_banks
for update
using (public.can_access_business_unit(business_unit_id))
with check (public.can_access_business_unit(business_unit_id));

create policy quiz_attempts_select_policy on public.quiz_attempts
for select
using (public.can_access_business_unit(business_unit_id));
create policy quiz_attempts_insert_policy on public.quiz_attempts
for insert
with check (public.can_access_business_unit(business_unit_id));
create policy quiz_attempts_update_policy on public.quiz_attempts
for update
using (public.has_full_access())
with check (public.has_full_access());

create policy tips_records_rw_policy on public.tips_records
for all
using (public.can_access_business_unit(business_unit_id))
with check (public.can_access_business_unit(business_unit_id));

create policy petty_cash_records_rw_policy on public.petty_cash_records
for all
using (public.can_access_business_unit(business_unit_id))
with check (public.can_access_business_unit(business_unit_id));

create policy temp_staff_records_rw_policy on public.temp_staff_records
for all
using (public.can_access_business_unit(business_unit_id))
with check (public.can_access_business_unit(business_unit_id));

create policy payroll_incidents_rw_policy on public.payroll_incidents
for all
using (public.can_access_business_unit(business_unit_id))
with check (public.can_access_business_unit(business_unit_id));

create policy loan_requests_rw_policy on public.loan_requests
for all
using (public.can_access_business_unit(business_unit_id))
with check (public.can_access_business_unit(business_unit_id));

create policy work_letters_rw_policy on public.work_letters
for all
using (public.can_access_business_unit(business_unit_id))
with check (public.can_access_business_unit(business_unit_id));

create policy memos_select_policy on public.memos
for select
using (
  business_unit_id is null
  or public.can_access_business_unit(business_unit_id)
);
create policy memos_insert_policy on public.memos
for insert
with check (
  business_unit_id is null
  or public.can_access_business_unit(business_unit_id)
);
create policy memos_update_policy on public.memos
for update
using (
  business_unit_id is null
  or public.can_access_business_unit(business_unit_id)
)
with check (
  business_unit_id is null
  or public.can_access_business_unit(business_unit_id)
);

create policy sop_documents_select_policy on public.sop_documents
for select
using (
  business_unit_id is null
  or public.can_access_business_unit(business_unit_id)
);
create policy sop_documents_insert_policy on public.sop_documents
for insert
with check (
  business_unit_id is null
  or public.can_access_business_unit(business_unit_id)
);
create policy sop_documents_update_policy on public.sop_documents
for update
using (
  business_unit_id is null
  or public.can_access_business_unit(business_unit_id)
)
with check (
  business_unit_id is null
  or public.can_access_business_unit(business_unit_id)
);

-- Optional delete restrictions (admin/rrhh only)
create policy admin_delete_employees_policy on public.employees
for delete
using (public.has_full_access());
create policy admin_delete_quiz_banks_policy on public.quiz_banks
for delete
using (public.has_full_access());
create policy admin_delete_quiz_attempts_policy on public.quiz_attempts
for delete
using (public.has_full_access());
create policy admin_delete_records_policy on public.tips_records
for delete
using (public.has_full_access());
create policy admin_delete_petty_cash_policy on public.petty_cash_records
for delete
using (public.has_full_access());
create policy admin_delete_temp_staff_policy on public.temp_staff_records
for delete
using (public.has_full_access());
create policy admin_delete_payroll_policy on public.payroll_incidents
for delete
using (public.has_full_access());
create policy admin_delete_loan_policy on public.loan_requests
for delete
using (public.has_full_access());
create policy admin_delete_work_letters_policy on public.work_letters
for delete
using (public.has_full_access());
create policy admin_delete_memos_policy on public.memos
for delete
using (public.has_full_access());
create policy admin_delete_sop_policy on public.sop_documents
for delete
using (public.has_full_access());
