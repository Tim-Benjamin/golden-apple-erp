-- ============================================
-- SHIFT TYPES (Morning, Afternoon, Night + custom)
-- ============================================

create table shift_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now()
);

alter table shift_types enable row level security;

create policy "shift_types_select_authenticated"
  on shift_types for select
  using (auth.role() = 'authenticated');

create policy "shift_types_write_admin_roles"
  on shift_types for all
  using (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr'))
  with check (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr'));

insert into shift_types (name, start_time, end_time) values
  ('Morning', '06:00', '14:00'),
  ('Afternoon', '14:00', '22:00'),
  ('Night', '22:00', '06:00');

-- ============================================
-- STAFF ROSTER (who should be working, per day)
-- ============================================

create type roster_status as enum ('scheduled', 'unavailable', 'swapped');

create table roster_entries (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id),
  shift_type_id uuid not null references shift_types(id),
  work_date date not null,
  status roster_status not null default 'scheduled',
  notes text,
  created_by uuid references staff(id),
  created_at timestamptz default now(),
  unique (staff_id, work_date, shift_type_id)
);

alter table roster_entries enable row level security;

create policy "roster_select_authenticated"
  on roster_entries for select
  using (auth.role() = 'authenticated');

create policy "roster_insert_admin_roles"
  on roster_entries for insert
  with check (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr'));

create policy "roster_update_admin_or_owner"
  on roster_entries for update
  using (
    current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr')
    or staff_id = auth.uid()
  )
  with check (
    current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr')
    or staff_id = auth.uid()
  );

create policy "roster_delete_admin_roles"
  on roster_entries for delete
  using (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr'));

-- ============================================
-- ATTENDANCE (who actually came to work)
-- ============================================

create type attendance_status as enum ('present', 'late', 'absent', 'on_leave');

create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id),
  work_date date not null,
  clock_in timestamptz,
  clock_out timestamptz,
  status attendance_status not null default 'present',
  roster_entry_id uuid references roster_entries(id),
  notes text,
  created_at timestamptz default now(),
  unique (staff_id, work_date)
);

alter table attendance_records enable row level security;

-- Everyone can see attendance (needed for "who's on duty today" visibility, matches
-- the "Today's Workforce" view in the spec)
create policy "attendance_select_authenticated"
  on attendance_records for select
  using (auth.role() = 'authenticated');

-- A staff member can clock themselves in/out; admins can record on anyone's behalf
create policy "attendance_insert_own_or_admin"
  on attendance_records for insert
  with check (
    staff_id = auth.uid()
    or current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr')
  );

create policy "attendance_update_own_or_admin"
  on attendance_records for update
  using (
    staff_id = auth.uid()
    or current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr')
  )
  with check (
    staff_id = auth.uid()
    or current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr')
  );