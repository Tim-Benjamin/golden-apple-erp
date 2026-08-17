-- ============================================
-- EMPLOYEE PROFILE: PERSONAL INFORMATION FIELDS
-- (Employment Info, Payroll, and Departments/Positions are intentionally
-- deferred — this covers Personal Information only, per current scope.)
-- ============================================

alter table staff
  add column if not exists date_of_birth date,
  add column if not exists gender text,
  add column if not exists address text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists avatar_url text;

-- Human-readable Employee ID (e.g. GA-0001), auto-assigned on creation
create sequence if not exists staff_code_seq start 1;

alter table staff add column if not exists staff_code text unique;

update staff
set staff_code = 'GA-' || lpad(nextval('staff_code_seq')::text, 4, '0')
where staff_code is null;

create or replace function assign_staff_code()
returns trigger as $$
begin
  if new.staff_code is null then
    new.staff_code := 'GA-' || lpad(nextval('staff_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_assign_staff_code before insert on staff
  for each row execute function assign_staff_code();

-- ============================================
-- AVATAR STORAGE (staff profile photos)
-- ============================================

insert into storage.buckets (id, name, public)
values ('staff-avatars', 'staff-avatars', true)
on conflict (id) do nothing;

-- Anyone logged in can view avatars (they're just profile photos, shown in directory)
create policy "avatar_public_read"
  on storage.objects for select
  using (bucket_id = 'staff-avatars');

-- A staff member can only upload/replace/delete their OWN avatar (folder named by their own id)
create policy "avatar_owner_write"
  on storage.objects for insert
  with check (bucket_id = 'staff-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_owner_update"
  on storage.objects for update
  using (bucket_id = 'staff-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'staff-avatars' and (storage.foldername(name))[1] = auth.uid()::text);