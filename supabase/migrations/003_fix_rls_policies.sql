-- Agregar políticas INSERT, UPDATE, DELETE para RLS

-- Organizations: permitir que usuarios autenticados creen su propia org
create policy "Authenticated users create orgs" on public.organizations
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Owner updates own org" on public.organizations
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owner deletes own org" on public.organizations
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- Screens: permitir que propietarios creen, actualicen, eliminen pantallas
create policy "Owner creates screens" on public.screens
  for insert
  to authenticated
  with check (org_id in (select id from public.organizations where owner_id = auth.uid()));

create policy "Owner updates screens" on public.screens
  for update
  to authenticated
  using (org_id in (select id from public.organizations where owner_id = auth.uid()))
  with check (org_id in (select id from public.organizations where owner_id = auth.uid()));

create policy "Owner deletes screens" on public.screens
  for delete
  to authenticated
  using (org_id in (select id from public.organizations where owner_id = auth.uid()));

-- Screens: permitir que la app TV actualice status (heartbeat)
create policy "Screen updates own status" on public.screens
  for update
  to authenticated
  using (org_id in (select id from public.organizations where owner_id = auth.uid()))
  with check (org_id in (select id from public.organizations where owner_id = auth.uid()));

-- Content items: permitir que propietarios creen, actualicen, eliminen
create policy "Owner creates content" on public.content_items
  for insert
  to authenticated
  with check (org_id in (select id from public.organizations where owner_id = auth.uid()));

create policy "Owner updates content" on public.content_items
  for update
  to authenticated
  using (org_id in (select id from public.organizations where owner_id = auth.uid()))
  with check (org_id in (select id from public.organizations where owner_id = auth.uid()));

create policy "Owner deletes content" on public.content_items
  for delete
  to authenticated
  using (org_id in (select id from public.organizations where owner_id = auth.uid()));

-- Playlists: permitir que propietarios creen, actualicen, eliminen
create policy "Owner creates playlists" on public.playlists
  for insert
  to authenticated
  with check (org_id in (select id from public.organizations where owner_id = auth.uid()));

create policy "Owner updates playlists" on public.playlists
  for update
  to authenticated
  using (org_id in (select id from public.organizations where owner_id = auth.uid()))
  with check (org_id in (select id from public.organizations where owner_id = auth.uid()));

create policy "Owner deletes playlists" on public.playlists
  for delete
  to authenticated
  using (org_id in (select id from public.organizations where owner_id = auth.uid()));

-- Playlist items: permitir que propietarios creen, actualicen, eliminen
create policy "Owner creates playlist items" on public.playlist_items
  for insert
  to authenticated
  with check (playlist_id in (
    select id from public.playlists where org_id in (
      select id from public.organizations where owner_id = auth.uid()
    )
  ));

create policy "Owner updates playlist items" on public.playlist_items
  for update
  to authenticated
  using (playlist_id in (
    select id from public.playlists where org_id in (
      select id from public.organizations where owner_id = auth.uid()
    )
  ))
  with check (playlist_id in (
    select id from public.playlists where org_id in (
      select id from public.organizations where owner_id = auth.uid()
    )
  ));

create policy "Owner deletes playlist items" on public.playlist_items
  for delete
  to authenticated
  using (playlist_id in (
    select id from public.playlists where org_id in (
      select id from public.organizations where owner_id = auth.uid()
    )
  ));
