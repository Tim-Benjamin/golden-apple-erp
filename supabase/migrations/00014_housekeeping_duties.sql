-- ============================================
-- HOUSEKEEPING DUTY SCHEDULING (calendar-based)
-- ============================================

create type duty_status as enum ('scheduled', 'completed');

create table housekeeping_duties (
  id uuid primary key default gen_random_uuid(),
  housekeeper_id uuid not null references staff(id),
  duty_date date not null,
  duty_area text not null, -- e.g. "Room R3", "Lobby", "Garden", "Parking Area", "Kitchen"
  room_id uuid references rooms(id), -- optional, only when the duty is tied to a specific room
  notes text,
  status duty_status not null default 'scheduled',
  completed_at timestamptz,
  completion_notes text,
  created_by uuid references staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table housekeeping_duties enable row level security;

create trigger trg_housekeeping_duties_updated_at before update on housekeeping_duties
  for each row execute function set_updated_at();

-- Everyone logged in can see the schedule (housekeepers need to see admin's assignments,
-- admin needs to see everyone's, and other roles can view for coordination)
create policy "duties_select_authenticated"
  on housekeeping_duties for select
  using (auth.role() = 'authenticated');

-- Only admin-tier roles can create scheduled duties
create policy "duties_insert_admin_roles"
  on housekeeping_duties for insert
  with check (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager'));

-- Admin-tier roles can edit any duty; a housekeeper can only update their own
-- (this is what lets them "check done" on their own assigned duties)
create policy "duties_update_admin_or_owner"
  on housekeeping_duties for update
  using (
    current_user_role() in ('super_admin', 'general_manager', 'assistant_manager')
    or housekeeper_id = auth.uid()
  )
  with check (
    current_user_role() in ('super_admin', 'general_manager', 'assistant_manager')
    or housekeeper_id = auth.uid()
  );

-- Only admin-tier roles can delete/remove a scheduled duty
create policy "duties_delete_admin_roles"
  on housekeeping_duties for delete
  using (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager'));