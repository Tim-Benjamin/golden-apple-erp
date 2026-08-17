-- ============================================
-- HOUSEKEEPING: CLEANING LOGS
-- ============================================

create table cleaning_logs (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  housekeeper_id uuid references staff(id),
  checklist jsonb not null default '{}',
  damage_found boolean default false,
  created_at timestamptz default now()
);

alter table cleaning_logs enable row level security;

create policy "cleaning_logs_select_authenticated"
  on cleaning_logs for select
  using (auth.role() = 'authenticated');

create policy "cleaning_logs_write_housekeeping_roles"
  on cleaning_logs for all
  using (current_user_role() in ('super_admin', 'general_manager', 'housekeeper'))
  with check (current_user_role() in ('super_admin', 'general_manager', 'housekeeper'));