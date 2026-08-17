-- ============================================
-- PUSH NOTIFICATION SUBSCRIPTIONS
-- ============================================

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique (staff_id, endpoint)
);

alter table push_subscriptions enable row level security;

-- Staff can manage their own subscriptions (created when they enable notifications
-- on their own device); admins can view all for troubleshooting.
create policy "push_subscriptions_select_own_or_admin"
  on push_subscriptions for select
  using (staff_id = auth.uid() or current_user_role() in ('super_admin', 'general_manager'));

create policy "push_subscriptions_insert_own"
  on push_subscriptions for insert
  with check (staff_id = auth.uid());

create policy "push_subscriptions_delete_own"
  on push_subscriptions for delete
  using (staff_id = auth.uid());