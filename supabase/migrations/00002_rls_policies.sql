-- Enable RLS on all core tables
alter table staff enable row level security;
alter table rooms enable row level security;
alter table guests enable row level security;
alter table reservations enable row level security;
alter table charges enable row level security;
alter table payments enable row level security;
alter table audit_log enable row level security;

-- Helper: get current user's role
create or replace function current_user_role()
returns user_role as $$
  select role from staff where id = auth.uid();
$$ language sql stable security definer;

-- ---------- STAFF ----------
-- Everyone logged in can view staff list (needed for assigning tasks etc.)
create policy "staff_select_all_authenticated"
  on staff for select
  using (auth.role() = 'authenticated');

-- Only super_admin and hr can insert/update staff records
create policy "staff_write_admin_hr"
  on staff for all
  using (current_user_role() in ('super_admin', 'hr'))
  with check (current_user_role() in ('super_admin', 'hr'));

-- ---------- ROOMS ----------
create policy "rooms_select_all_authenticated"
  on rooms for select
  using (auth.role() = 'authenticated');

create policy "rooms_write_front_desk_and_up"
  on rooms for all
  using (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'front_desk', 'housekeeper', 'maintenance_officer'))
  with check (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'front_desk', 'housekeeper', 'maintenance_officer'));

-- ---------- GUESTS ----------
create policy "guests_select_all_authenticated"
  on guests for select
  using (auth.role() = 'authenticated');

create policy "guests_write_front_desk_and_up"
  on guests for all
  using (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'front_desk'))
  with check (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'front_desk'));

-- ---------- RESERVATIONS ----------
create policy "reservations_select_all_authenticated"
  on reservations for select
  using (auth.role() = 'authenticated');

create policy "reservations_write_front_desk_and_up"
  on reservations for all
  using (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'front_desk'))
  with check (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'front_desk'));

-- ---------- CHARGES ----------
create policy "charges_select_all_authenticated"
  on charges for select
  using (auth.role() = 'authenticated');

create policy "charges_write_front_desk_and_up"
  on charges for all
  using (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'front_desk'))
  with check (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'front_desk'));

-- ---------- PAYMENTS ----------
create policy "payments_select_finance_roles"
  on payments for select
  using (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'front_desk', 'accountant', 'auditor'));

create policy "payments_write_front_desk_and_up"
  on payments for all
  using (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'front_desk', 'accountant'))
  with check (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'front_desk', 'accountant'));

-- ---------- AUDIT LOG ----------
-- Only super_admin and auditor can read it. System (via edge functions) writes to it.
create policy "audit_log_select_admin_auditor"
  on audit_log for select
  using (current_user_role() in ('super_admin', 'auditor'));

create policy "audit_log_insert_authenticated"
  on audit_log for insert
  with check (auth.role() = 'authenticated');