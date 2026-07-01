-- SOP storage bucket and policies
-- Execute in Supabase SQL editor (or via migration tooling)

insert into storage.buckets (id, name, public)
values ('sop-documents', 'sop-documents', true)
on conflict (id) do nothing;

drop policy if exists "sop_documents_public_read" on storage.objects;
create policy "sop_documents_public_read"
on storage.objects
for select
using (bucket_id = 'sop-documents');

drop policy if exists "sop_documents_authenticated_insert" on storage.objects;
create policy "sop_documents_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'sop-documents');

drop policy if exists "sop_documents_authenticated_update" on storage.objects;
create policy "sop_documents_authenticated_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'sop-documents')
with check (bucket_id = 'sop-documents');

drop policy if exists "sop_documents_authenticated_delete" on storage.objects;
create policy "sop_documents_authenticated_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'sop-documents');
