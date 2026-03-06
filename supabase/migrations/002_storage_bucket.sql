-- Storage bucket para contenido multimedia
insert into storage.buckets (id, name, public)
values ('content', 'content', true)
on conflict (id) do nothing;

-- Política: usuarios autenticados pueden subir a su carpeta
create policy "Authenticated users upload content"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'content'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Política: lectura pública (las pantallas necesitan acceder sin auth)
create policy "Public read content"
on storage.objects for select
to public
using (bucket_id = 'content');

-- Política: el dueño puede eliminar su contenido
create policy "Owner delete content"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'content'
  and (storage.foldername(name))[1] = auth.uid()::text
);
