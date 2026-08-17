-- ============================================
-- STAFF TASKS
-- ============================================

create type task_priority as enum ('low', 'medium', 'high');
create type task_status as enum ('pending', 'in_progress', 'completed', 'verified');

create table staff_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assigned_to uuid not null references staff(id),
  assigned_by uuid references staff(id),
  priority task_priority not null default 'medium',
  due_at timestamptz,
  status task_status not null default 'pending',
  completed_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table staff_tasks enable row level security;
create trigger trg_staff_tasks_updated_at before update on staff_tasks
  for each row execute function set_updated_at();

create policy "tasks_select_authenticated"
  on staff_tasks for select
  using (auth.role() = 'authenticated');

create policy "tasks_insert_admin_roles"
  on staff_tasks for insert
  with check (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr'));

create policy "tasks_update_admin_or_assignee"
  on staff_tasks for update
  using (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr') or assigned_to = auth.uid())
  with check (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr') or assigned_to = auth.uid());

create policy "tasks_delete_admin_roles"
  on staff_tasks for delete
  using (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr'));

-- ============================================
-- STAFF CHECKLISTS (recurring, per-role)
-- ============================================

create type checklist_recurrence as enum ('daily', 'weekly', 'monthly');

create table checklist_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  applicable_roles user_role[] not null default '{}',
  recurrence checklist_recurrence not null default 'daily',
  items jsonb not null default '[]',
  is_active boolean default true,
  created_by uuid references staff(id),
  created_at timestamptz default now()
);

alter table checklist_templates enable row level security;

create policy "checklist_templates_select_authenticated"
  on checklist_templates for select
  using (auth.role() = 'authenticated');

create policy "checklist_templates_write_admin_roles"
  on checklist_templates for all
  using (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr'))
  with check (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr'));

create table checklist_completions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references checklist_templates(id) on delete cascade,
  staff_id uuid not null references staff(id),
  work_date date not null,
  checked_items jsonb not null default '[]',
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique (template_id, staff_id, work_date)
);

alter table checklist_completions enable row level security;

create policy "checklist_completions_select_authenticated"
  on checklist_completions for select
  using (auth.role() = 'authenticated');

create policy "checklist_completions_insert_own_or_admin"
  on checklist_completions for insert
  with check (staff_id = auth.uid() or current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr'));

create policy "checklist_completions_update_own_or_admin"
  on checklist_completions for update
  using (staff_id = auth.uid() or current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr'))
  with check (staff_id = auth.uid() or current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'hr'));

-- Seed the four example checklists straight from the Staff Management spec
insert into checklist_templates (title, applicable_roles, recurrence, items) values
('Front Desk Checklist', array['front_desk','general_manager','super_admin']::user_role[], 'daily',
  '["Review today''s arrivals","Review departures","Confirm reservations","Check pending payments","Check guest requests","Review messages"]'::jsonb),
('Housekeeping Checklist', array['housekeeper','general_manager','super_admin']::user_role[], 'daily',
  '["Check assigned rooms","Complete cleaning","Check bathroom","Check towels","Check toiletries","Check furniture","Report damages"]'::jsonb),
('Kitchen Checklist', array['kitchen_staff','general_manager','super_admin']::user_role[], 'daily',
  '["Check food supplies","Check refrigerator","Check expiry dates","Clean kitchen","Record wastage"]'::jsonb),
('Maintenance Checklist', array['maintenance_officer','general_manager','super_admin']::user_role[], 'daily',
  '["Check generator","Check AC","Check water","Check electricity","Check equipment"]'::jsonb);