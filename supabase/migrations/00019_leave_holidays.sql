-- ============================================
-- LEAVE & HOLIDAYS
-- ============================================

create type leave_type as enum ('annual', 'sick', 'emergency', 'maternity_paternity', 'unpaid');
create type leave_status as enum ('pending', 'approved', 'rejected', 'cancelled');

create table leave_entitlements (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  year int not null,
  annual_days numeric(5,1) not null default 15,
  created_at timestamptz default now(),
  unique (staff_id, year)
);

alter table leave_entitlements enable row level security;

create policy "leave_entitlements_select_authenticated"
  on leave_entitlements for select
  using (auth.role() = 'authenticated');

create policy "leave_entitlements_write_admin_roles"
  on leave_entitlements for all
  using (current_user_role() in ('super_admin', 'general_manager', 'hr'))
  with check (current_user_role() in ('super_admin', 'general_manager', 'hr'));

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id),
  leave_type leave_type not null,
  start_date date not null,
  end_date date not null,
  reason text,
  status leave_status not null default 'pending',
  reviewed_by uuid references staff(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table leave_requests enable row level security;
create trigger trg_leave_requests_updated_at before update on leave_requests
  for each row execute function set_updated_at();

create policy "leave_requests_select_authenticated"
  on leave_requests for select
  using (auth.role() = 'authenticated');

create policy "leave_requests_insert_own"
  on leave_requests for insert
  with check (staff_id = auth.uid());

create policy "leave_requests_update_own_or_admin"
  on leave_requests for update
  using (
    (staff_id = auth.uid() and status = 'pending')
    or current_user_role() in ('super_admin', 'general_manager', 'hr')
  )
  with check (
    (staff_id = auth.uid() and status in ('pending', 'cancelled'))
    or current_user_role() in ('super_admin', 'general_manager', 'hr')
  );