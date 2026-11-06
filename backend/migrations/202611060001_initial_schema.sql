-- iSIKHNAS Vaksinasi: initial relational backend
-- Roles are assigned by administrators in public.user_roles, never by signup metadata.
create extension if not exists pgcrypto;

create type public.app_role as enum (
  'national_admin','program_coordinator','team_lead','vaccinator',
  'coverage_assessor','logistics_officer','viewer'
);
create type public.program_status as enum ('draft','active','paused','completed','archived');

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  institution text,
  phone text,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  primary key(user_id,role)
);
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  program_code text not null unique,
  name text not null,
  status public.program_status not null default 'draft',
  start_date date not null,
  end_date date not null,
  species text[] not null default '{}',
  indicators jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check(end_date >= start_date)
);
create table public.program_members (
  program_id uuid not null references public.programs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  team_name text,
  created_at timestamptz not null default now(),
  primary key(program_id,user_id)
);
create or replace function public.add_program_creator_as_member()
returns trigger language plpgsql security definer set search_path=public
as $ begin
  insert into public.program_members(program_id,user_id,role,team_name)
  values(new.id,new.created_by,'program_coordinator','Koordinator')
  on conflict(program_id,user_id) do nothing;
  return new;
end; $;
create trigger add_program_creator_to_members
after insert on public.programs
for each row execute function public.add_program_creator_as_member();

create table public.village_targets (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  province_code text,
  regency_code text,
  district_code text,
  village_code text not null,
  village_name text not null,
  species text not null,
  target_population integer not null check(target_population >= 0),
  expected_visits integer not null default 1 check(expected_visits > 0),
  updated_by uuid not null default auth.uid() references auth.users(id),
  updated_at timestamptz not null default now(),
  unique(program_id,village_code,species)
);
create table public.field_sessions (
  id uuid primary key default gen_random_uuid(),
  client_event_id uuid not null unique,
  program_id uuid not null references public.programs(id) on delete cascade,
  team_name text not null,
  village_code text not null,
  species text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  status text not null check(status in ('in_progress','completed')),
  gps_track jsonb not null default '[]'::jsonb,
  created_by uuid not null default auth.uid() references auth.users(id),
  synced_at timestamptz not null default now()
);
create table public.vaccination_events (
  id uuid primary key default gen_random_uuid(),
  client_event_id uuid not null unique,
  program_id uuid not null references public.programs(id) on delete cascade,
  session_id uuid references public.field_sessions(id) on delete set null,
  village_code text not null,
  species text not null,
  vaccinated_count integer not null check(vaccinated_count > 0),
  vaccinated_at timestamptz not null,
  latitude double precision,
  longitude double precision,
  location_accuracy_m numeric,
  vaccine_name text,
  batch_number text,
  dose_number text,
  animal_group jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  synced_at timestamptz not null default now(),
  check((latitude is null and longitude is null) or
        (latitude between -90 and 90 and longitude between -180 and 180))
);
create table public.coverage_surveys (
  id uuid primary key default gen_random_uuid(),
  client_event_id uuid not null unique,
  program_id uuid not null references public.programs(id) on delete cascade,
  village_code text not null,
  species text not null,
  survey_date date not null,
  sampled_households integer not null default 0 check(sampled_households >= 0),
  animals_eligible integer not null default 0 check(animals_eligible >= 0),
  animals_verified_vaccinated integer not null default 0 check(animals_verified_vaccinated >= 0),
  latitude double precision,
  longitude double precision,
  method text,
  notes text,
  assessor_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.logistics_items (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  item_name text not null,
  unit text not null,
  planned_quantity numeric not null default 0 check(planned_quantity >= 0),
  created_at timestamptz not null default now(),
  unique(program_id,item_name,unit)
);
create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  client_event_id uuid not null unique,
  program_id uuid not null references public.programs(id) on delete cascade,
  item_id uuid not null references public.logistics_items(id) on delete cascade,
  village_code text,
  transaction_type text not null check(transaction_type in ('received','issued','used','wasted','returned')),
  quantity numeric not null check(quantity > 0),
  batch_number text,
  occurred_at timestamptz not null default now(),
  recorded_by uuid not null default auth.uid() references auth.users(id)
);

create index vaccination_program_village_species_idx on public.vaccination_events(program_id,village_code,species);
create index survey_program_village_species_idx on public.coverage_surveys(program_id,village_code,species);
create index targets_program_village_idx on public.village_targets(program_id,village_code);

create or replace function public.has_global_role(allowed public.app_role[])
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.user_roles r where r.user_id=auth.uid() and r.role=any(allowed)); $$;
create or replace function public.is_program_member(p_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.program_members m where m.program_id=p_id and m.user_id=auth.uid()); $$;
create or replace function public.has_program_role(p_id uuid, allowed public.app_role[])
returns boolean language sql stable security definer set search_path=public
as $$ select public.has_global_role(array['national_admin']::public.app_role[])
 or exists(select 1 from public.program_members m where m.program_id=p_id and m.user_id=auth.uid() and m.role=any(allowed)); $$;

alter table public.user_profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.programs enable row level security;
alter table public.program_members enable row level security;
alter table public.village_targets enable row level security;
alter table public.field_sessions enable row level security;
alter table public.vaccination_events enable row level security;
alter table public.coverage_surveys enable row level security;
alter table public.logistics_items enable row level security;
alter table public.inventory_transactions enable row level security;

create policy profile_read_self_or_admin on public.user_profiles for select using(user_id=auth.uid() or public.has_global_role(array['national_admin']::public.app_role[]));
create policy profile_insert_self_or_admin on public.user_profiles for insert with check(user_id=auth.uid() or public.has_global_role(array['national_admin']::public.app_role[]));
create policy profile_update_self_or_admin on public.user_profiles for update using(user_id=auth.uid() or public.has_global_role(array['national_admin']::public.app_role[])) with check(user_id=auth.uid() or public.has_global_role(array['national_admin']::public.app_role[]));
create policy roles_read_self_or_admin on public.user_roles for select using(user_id=auth.uid() or public.has_global_role(array['national_admin']::public.app_role[]));
create policy roles_admin_manage on public.user_roles for all using(public.has_global_role(array['national_admin']::public.app_role[])) with check(public.has_global_role(array['national_admin']::public.app_role[]));

create policy program_read_member on public.programs for select using(public.is_program_member(id) or public.has_global_role(array['national_admin']::public.app_role[]));
create policy program_create_coordinator on public.programs for insert with check(created_by=auth.uid() and public.has_global_role(array['program_coordinator','national_admin']::public.app_role[]));
create policy program_update_coordinator on public.programs for update using(public.has_program_role(id,array['program_coordinator']::public.app_role[])) with check(public.has_program_role(id,array['program_coordinator']::public.app_role[]));
create policy members_read_scoped on public.program_members for select using(user_id=auth.uid() or public.has_program_role(program_id,array['program_coordinator']::public.app_role[]));
create policy members_manage_coordinator on public.program_members for all using(public.has_program_role(program_id,array['program_coordinator']::public.app_role[])) with check(public.has_program_role(program_id,array['program_coordinator']::public.app_role[]));

create policy targets_read_member on public.village_targets for select using(public.is_program_member(program_id));
create policy targets_write_coordinator on public.village_targets for all using(public.has_program_role(program_id,array['program_coordinator']::public.app_role[])) with check(public.has_program_role(program_id,array['program_coordinator']::public.app_role[]));
create policy sessions_read_member on public.field_sessions for select using(public.is_program_member(program_id));
create policy sessions_write_field_team on public.field_sessions for all using(public.has_program_role(program_id,array['team_lead','vaccinator']::public.app_role[])) with check(public.has_program_role(program_id,array['team_lead','vaccinator']::public.app_role[]));
create policy vaccine_read_member on public.vaccination_events for select using(public.is_program_member(program_id));
create policy vaccine_write_field_team on public.vaccination_events for all using(public.has_program_role(program_id,array['team_lead','vaccinator']::public.app_role[])) with check(public.has_program_role(program_id,array['team_lead','vaccinator']::public.app_role[]));
create policy survey_read_member on public.coverage_surveys for select using(public.is_program_member(program_id));
create policy survey_write_assessor on public.coverage_surveys for all using(public.has_program_role(program_id,array['coverage_assessor']::public.app_role[])) with check(public.has_program_role(program_id,array['coverage_assessor']::public.app_role[]));
create policy logistics_read_member on public.logistics_items for select using(public.is_program_member(program_id));
create policy logistics_write_officer on public.logistics_items for all using(public.has_program_role(program_id,array['logistics_officer','program_coordinator']::public.app_role[])) with check(public.has_program_role(program_id,array['logistics_officer','program_coordinator']::public.app_role[]));
create policy inventory_read_member on public.inventory_transactions for select using(public.is_program_member(program_id));
create policy inventory_write_officer on public.inventory_transactions for all using(public.has_program_role(program_id,array['logistics_officer']::public.app_role[])) with check(public.has_program_role(program_id,array['logistics_officer']::public.app_role[]));

grant usage on schema public to authenticated;
grant select,insert,update,delete on public.user_profiles,public.programs,public.program_members,public.village_targets,public.field_sessions,public.vaccination_events,public.coverage_surveys,public.logistics_items,public.inventory_transactions,public.user_roles to authenticated;
