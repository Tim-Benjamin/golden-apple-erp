-- ============================================
-- INVENTORY MANAGEMENT
-- ============================================

create type inventory_category as enum (
  'food',
  'drinks',
  'cleaning_supplies',
  'guest_supplies',
  'office_supplies',
  'furniture',
  'maintenance_items'
);

create type stock_movement_type as enum (
  'receive',
  'issue',
  'transfer',
  'return',
  'adjust'
);

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category inventory_category not null,
  unit text not null default 'unit', -- e.g. 'bottle', 'kg', 'pack'
  quantity_on_hand numeric(10,2) not null default 0,
  low_stock_threshold numeric(10,2) default 5,
  expiry_date date, -- nullable, only relevant for perishables
  unit_cost numeric(10,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references inventory_items(id) on delete cascade,
  movement_type stock_movement_type not null,
  quantity numeric(10,2) not null, -- always positive; direction is derived from movement_type
  reason text,
  performed_by uuid references staff(id),
  created_at timestamptz default now()
);

alter table inventory_items enable row level security;
alter table stock_movements enable row level security;

create trigger trg_inventory_items_updated_at before update on inventory_items
  for each row execute function set_updated_at();

create policy "inventory_items_select_authenticated"
  on inventory_items for select
  using (auth.role() = 'authenticated');

create policy "inventory_items_write_relevant_roles"
  on inventory_items for all
  using (current_user_role() in ('super_admin', 'general_manager', 'store_manager', 'kitchen_staff'))
  with check (current_user_role() in ('super_admin', 'general_manager', 'store_manager', 'kitchen_staff'));

create policy "stock_movements_select_authenticated"
  on stock_movements for select
  using (auth.role() = 'authenticated');

create policy "stock_movements_write_relevant_roles"
  on stock_movements for all
  using (current_user_role() in ('super_admin', 'general_manager', 'store_manager', 'kitchen_staff'))
  with check (current_user_role() in ('super_admin', 'general_manager', 'store_manager', 'kitchen_staff'));