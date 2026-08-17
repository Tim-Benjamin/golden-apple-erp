alter table reservations
  add column if not exists cancellation_deadline timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists auto_confirmed boolean default false;

create table if not exists refunds (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  amount numeric(10,2) not null,
  method payment_method not null,
  reason text,
  processed_by uuid references staff(id),
  created_at timestamptz default now()
);

alter table refunds enable row level security;

create policy "refunds_select_finance_roles"
  on refunds for select
  using (current_user_role() in ('super_admin', 'general_manager', 'accountant', 'auditor', 'front_desk'));

create policy "refunds_write_front_desk_and_up"
  on refunds for all
  using (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'front_desk', 'accountant'))
  with check (current_user_role() in ('super_admin', 'general_manager', 'assistant_manager', 'front_desk', 'accountant'));