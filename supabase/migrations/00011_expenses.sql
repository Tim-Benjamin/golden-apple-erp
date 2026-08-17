-- ============================================
-- BUSINESS EXPENSES
-- ============================================

create type expense_category as enum (
  'electricity',
  'water',
  'gas',
  'internet',
  'staff_salaries',
  'purchases',
  'repairs',
  'fuel',
  'marketing',
  'other'
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  category expense_category not null,
  description text,
  amount numeric(10,2) not null,
  payment_method payment_method not null default 'cash',
  recorded_by uuid references staff(id),
  expense_date date not null default current_date,
  created_at timestamptz default now()
);

alter table expenses enable row level security;

create policy "expenses_select_finance_roles"
  on expenses for select
  using (current_user_role() in ('super_admin', 'general_manager', 'accountant', 'auditor'));

create policy "expenses_write_finance_roles"
  on expenses for all
  using (current_user_role() in ('super_admin', 'general_manager', 'accountant'))
  with check (current_user_role() in ('super_admin', 'general_manager', 'accountant'));