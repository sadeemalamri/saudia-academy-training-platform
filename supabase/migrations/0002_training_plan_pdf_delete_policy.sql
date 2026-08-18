drop policy if exists "training plan pdfs: admin can delete"
on storage.objects;

create policy "training plan pdfs: admin can delete"
on storage.objects
for delete
using (
  bucket_id = 'training-plans'
  and public.is_admin()
);