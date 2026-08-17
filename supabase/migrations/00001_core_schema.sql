-- ============================================
-- GOLDEN APPLE ERP — CORE SCHEMA
-- ============================================

-- ---------- ROLES ----------
create type user_role as enum (
  'super_admin',
  'general_manager',
  'assistant_manager',
  'front_desk',
  'accountant',
  'housekeeper',
  'maintenance_officer',
  'kitchen_staff',
  'store_manager',
  'security',
  'hr',
  'auditor'
);

-- ---------- STAFF / PROFILES ----------
-- Linked 1:1 to Supabase auth.users
create table staff (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role user_role not null,
  position text,
  is_active boolean default true,
  hire_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- ROOMS ----------
create type room_status as enum (
  'vacant',
  'occupied',
  'reserved',
  'cleaning',
  'out_of_service'
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  room_number text not null unique, -- 'R1' .. 'R10'
  room_type text,
  price numeric(10,2) not null default 0,
  status room_status not null default 'vacant',
  last_cleaned_at timestamptz,
  last_maintenance_at timestamptz,
  housekeeper_id uuid references staff(id),
  amenities text[],
  photos text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- GUESTS ----------
create table guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  passport_or_id text,
  nationality text,
  phone text,
  email text,
  vehicle_number text,
  is_vip boolean default false,
  is_blacklisted boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- RESERVATIONS ----------
create type reservation_status as enum (
  'confirmed',
  'pending',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show'
);

create type booking_source as enum (
  'booking_com',
  'expedia',
  'agoda',
  'airbnb',
  'direct',
  'phone_call',
  'whatsapp',
  'walk_in'
);

create table reservations (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests(id),
  room_id uuid not null references rooms(id),
  status reservation_status not null default 'pending',
  booking_source booking_source not null default 'direct',
  number_of_guests int default 1,
  arrival_time timestamptz,
  check_in_date date not null,
  check_out_date date not null,
  actual_check_in timestamptz,
  actual_check_out timestamptz,
  created_by uuid references staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- CHARGES (room, food, drinks, laundry, damage, levy) ----------
create type charge_type as enum (
  'room',
  'food',
  'drinks',
  'laundry',
  'damage',
  'tourist_levy',
  'other'
);

create table charges (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  charge_type charge_type not null,
  description text,
  amount numeric(10,2) not null,
  created_by uuid references staff(id),
  created_at timestamptz default now()
);

-- ---------- PAYMENTS ----------
create type payment_method as enum (
  'cash',
  'momo',
  'pos',
  'bank_transfer',
  'stripe'
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  amount numeric(10,2) not null,
  method payment_method not null,
  reference text, -- transaction ref / receipt number
  received_by uuid references staff(id),
  created_at timestamptz default now()
);

-- ---------- AUDIT LOG (for Super Admin email trigger later) ----------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references staff(id),
  action text not null,          -- e.g. 'check_in', 'payment_recorded', 'reservation_created'
  entity_table text not null,    -- e.g. 'reservations'
  entity_id uuid,
  details jsonb,
  created_at timestamptz default now()
);

-- ---------- UPDATED_AT TRIGGER HELPER ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_staff_updated_at before update on staff
  for each row execute function set_updated_at();
create trigger trg_rooms_updated_at before update on rooms
  for each row execute function set_updated_at();
create trigger trg_guests_updated_at before update on guests
  for each row execute function set_updated_at();
create trigger trg_reservations_updated_at before update on reservations
  for each row execute function set_updated_at();

-- ---------- SEED: ROOMS R1–R10 ----------
insert into rooms (room_number, room_type, price, status)
values
  ('R1', 'Standard', 300, 'vacant'),
  ('R2', 'Standard', 300, 'vacant'),
  ('R3', 'Standard', 300, 'vacant'),
  ('R4', 'Standard', 300, 'vacant'),
  ('R5', 'Deluxe', 450, 'vacant'),
  ('R6', 'Deluxe', 450, 'vacant'),
  ('R7', 'Deluxe', 450, 'vacant'),
  ('R8', 'Suite', 600, 'vacant'),
  ('R9', 'Suite', 600, 'vacant'),
  ('R10', 'Suite', 600, 'vacant');