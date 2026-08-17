-- ============================================
-- STAFF DOCUMENTS (private storage — contracts, IDs, certificates, etc.)
-- ============================================

create type document_type as enum (
  'contract', 'id_card', 'passport', 'certificate', 'training_certificate',
  'health_certificate', 'tax_document', 'ssnit_document', 'warning_letter', 'other'
);

create table staff_documents (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  document_type document_type not null,
  title text not null,
  file_path text not null,
  expiry_date date,
  uploaded_by uuid references staff(id),
  created_at timestamptz default now()
);

alter table staff_documents enable row level security;

create policy "documents_select_own_or_admin"
  on staff_documents for select
  using (staff_id = auth.uid() or current_user_role() in ('super_admin', 'general_manager', 'hr'));

create policy "documents_insert_own_or_admin"
  on staff_documents for insert
  with check (staff_id = auth.uid() or current_user_role() in ('super_admin', 'general_manager', 'hr'));

create policy "documents_delete_own_or_admin"
  on staff_documents for delete
  using (staff_id = auth.uid() or current_user_role() in ('super_admin', 'general_manager', 'hr'));

-- Private bucket — documents are sensitive (contracts, IDs), unlike public avatars
insert into storage.buckets (id, name, public)
values ('staff-documents', 'staff-documents', false)
on conflict (id) do nothing;

create policy "staff_docs_select_own_or_admin"
  on storage.objects for select
  using (
    bucket_id = 'staff-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or current_user_role() in ('super_admin', 'general_manager', 'hr')
    )
  );

create policy "staff_docs_insert_own_or_admin"
  on storage.objects for insert
  with check (
    bucket_id = 'staff-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or current_user_role() in ('super_admin', 'general_manager', 'hr')
    )
  );

create policy "staff_docs_delete_own_or_admin"
  on storage.objects for delete
  using (
    bucket_id = 'staff-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or current_user_role() in ('super_admin', 'general_manager', 'hr')
    )
  );

-- ============================================
-- TRAINING & CERTIFICATIONS
-- ============================================

create table staff_trainings (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  training_name text not null,
  trainer text,
  training_date date not null default current_date,
  score numeric(5,2),
  expiry_date date,
  document_id uuid references staff_documents(id) on delete set null,
  created_by uuid references staff(id),
  created_at timestamptz default now()
);

alter table staff_trainings enable row level security;

create policy "trainings_select_own_or_admin"
  on staff_trainings for select
  using (staff_id = auth.uid() or current_user_role() in ('super_admin', 'general_manager', 'hr'));

create policy "trainings_write_admin_roles"
  on staff_trainings for all
  using (current_user_role() in ('super_admin', 'general_manager', 'hr'))
  with check (current_user_role() in ('super_admin', 'general_manager', 'hr'));