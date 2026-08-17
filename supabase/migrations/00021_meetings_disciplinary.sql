create type meeting_type as enum ('management', 'weekly_staff', 'department', 'training');
create type action_item_status as enum ('open', 'converted', 'done');

create table staff_meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_type meeting_type not null default 'weekly_staff',
  meeting_date date not null default current_date,
  agenda text,
  minutes text,
  decisions text,
  created_by uuid references staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table staff_meetings enable row level security;
create trigger trg_staff_meetings_updated_at before update on staff_meetings
  for each row execute function set_updated_at();

create policy "meetings_select_authenticated"
  on staff_meetings for select
  using (auth.role() = 'authenticated');

create policy "meetings_write_admin_roles"
  on staff_meetings for all
  using (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr'))
  with check (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr'));

create table meeting_attendees (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references staff_meetings(id) on delete cascade,
  staff_id uuid not null references staff(id),
  attended boolean default true,
  unique (meeting_id, staff_id)
);

alter table meeting_attendees enable row level security;

create policy "meeting_attendees_select_authenticated"
  on meeting_attendees for select
  using (auth.role() = 'authenticated');

create policy "meeting_attendees_write_admin_roles"
  on meeting_attendees for all
  using (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr'))
  with check (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr'));

create table meeting_action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references staff_meetings(id) on delete cascade,
  description text not null,
  assigned_to uuid references staff(id),
  due_date date,
  status action_item_status not null default 'open',
  converted_to_task_id uuid references staff_tasks(id),
  created_at timestamptz default now()
);

alter table meeting_action_items enable row level security;

create policy "action_items_select_authenticated"
  on meeting_action_items for select
  using (auth.role() = 'authenticated');

create policy "action_items_write_admin_or_assignee"
  on meeting_action_items for all
  using (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr') or assigned_to = auth.uid())
  with check (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr') or assigned_to = auth.uid());

-- ============================================
-- DISCIPLINARY RECORDS (restricted to management/HR only — not visible to the
-- employee themselves through this system; handled via separate HR process)
-- ============================================

create table disciplinary_records (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id),
  incident_date date not null default current_date,
  description text not null,
  warning_level text not null default 'verbal', -- verbal | written | final | termination
  employee_response text,
  management_decision text,
  follow_up_date date,
  follow_up_notes text,
  created_by uuid references staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table disciplinary_records enable row level security;
create trigger trg_disciplinary_records_updated_at before update on disciplinary_records
  for each row execute function set_updated_at();

-- Strictly management/HR — no self-access, matching the spec's "Restricted to
-- management/HR" note. No delete policy either: this is a permanent audit history.
create policy "disciplinary_select_admin_hr"
  on disciplinary_records for select
  using (current_user_role() in ('super_admin', 'general_manager', 'hr'));

create policy "disciplinary_insert_admin_hr"
  on disciplinary_records for insert
  with check (current_user_role() in ('super_admin', 'general_manager', 'hr'));

create policy "disciplinary_update_admin_hr"
  on disciplinary_records for update
  using (current_user_role() in ('super_admin', 'general_manager', 'hr'))
  with check (current_user_role() in ('super_admin', 'general_manager', 'hr'));