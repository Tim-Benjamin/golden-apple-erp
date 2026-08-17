-- ============================================
-- FULLY SCHEMA-QUALIFIED VERSION
-- ============================================

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.handle_new_user()
returns trigger as $$
declare
  meta_full_name text;
  meta_role text;
  final_role public.user_role;
begin
  meta_full_name := new.raw_user_meta_data->>'full_name';
  meta_role := new.raw_user_meta_data->>'role';

  begin
    final_role := coalesce(meta_role, 'front_desk')::public.user_role;
  exception when invalid_text_representation then
    final_role := 'front_desk'::public.user_role;
  end;

  insert into public.staff (id, full_name, email, role)
  values (
    new.id,
    coalesce(meta_full_name, split_part(new.email, '@', 1)),
    new.email,
    final_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();