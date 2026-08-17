-- ============================================
-- MAINTENANCE REQUESTS
-- ============================================

create type maintenance_category as enum (
  'electrical',
  'plumbing',
  'ac',
  'generator',
  'furniture',
  'painting',
  'cleaning_equipment',
  'other'
);

create type maintenance_priority as enum ('low', 'medium', 'high', 'urgent');

create type maintenance_status as enum ('open', 'in_progress', 'completed', 'cancelled');

create table maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete set null,
  category maintenance_category not null default 'other',
  priority maintenance_priority not null default 'medium',
  status maintenance_status not null default 'open',
  description text not null,
  assigned_to uuid references staff(id),
  reported_by uuid references staff(id),
  cost numeric(10,2),
  photo_before text,
  photo_after text,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table maintenance_requests enable row level security;

create trigger trg_maintenance_updated_at before update on maintenance_requests
  for each row execute function set_updated_at();

create policy "maintenance_select_authenticated"
  on maintenance_requests for select
  using (auth.role() = 'authenticated');

create policy "maintenance_write_relevant_roles"
  on maintenance_requests for all
  using (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'maintenance_officer', 'housekeeper', 'front_desk'))
  with check (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'maintenance_officer', 'housekeeper', 'front_desk'));