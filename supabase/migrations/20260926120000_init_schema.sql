-- Ayraç initial schema: works, copies, ownership trigger, RLS, atomic add/delete functions.
--
-- Target: Supabase-hosted Postgres (the "Postgres version" shown under Project Settings > Infrastructure
-- in the dashboard; nothing here needs more than Postgres 15).
--
-- Slug lists (copies.format, works.genre) are one-way doors. They must match src/lib/vocab.ts (plan 01-08)
-- and the format.* / genre.* i18n keys. Change all three in one commit; a removed or renamed slug also
-- needs a data migration of existing rows.
--
-- Security model: every table has RLS from its first statement, policies are scoped to
-- (select auth.uid()) = user_id, the anon role has no table privileges, and every function is
-- SECURITY INVOKER with an empty search_path so RLS always applies to the caller.

-- ---------------------------------------------------------------------------------------------------
-- works: the ownership identity ("do I own this book?" matches on a work)
-- ---------------------------------------------------------------------------------------------------
create table public.works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  authors text[] not null default '{}',
  genre text,
  series text,
  series_position numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint works_title_length check (char_length(btrim(title)) between 1 and 500),
  constraint works_authors_count check (cardinality(authors) <= 20),
  constraint works_genre_check check (
    genre is null or genre in (
      'novel', 'short_stories', 'poetry', 'drama', 'essay', 'classics', 'science_fiction',
      'fantasy', 'crime', 'humor', 'children', 'biography', 'history', 'philosophy',
      'psychology', 'politics_society', 'religion_mythology', 'science', 'art',
      'self_help', 'travel', 'other'
    )
  ),
  constraint works_series_length check (series is null or char_length(btrim(series)) between 1 and 200),
  constraint works_series_position_check check (
    series_position is null or (series_position > 0 and series is not null)
  )
);

-- ---------------------------------------------------------------------------------------------------
-- copies: the physical unit (one library tile each). user_id is denormalised from the parent work so
-- RLS stays join-free; the trigger below is the only thing that ever sets it.
-- ---------------------------------------------------------------------------------------------------
create table public.copies (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works (id) on delete cascade,
  user_id uuid not null,
  format text not null,
  publisher text,
  edition_title text,
  volume_coverage numeric[],
  cover_url text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint copies_format_check check (
    format in ('standard', 'graphic_novel', 'hardcover', 'pocket', 'special_edition', 'other')
  ),
  constraint copies_publisher_length check (publisher is null or char_length(btrim(publisher)) between 1 and 200),
  constraint copies_edition_title_length check (
    edition_title is null or char_length(btrim(edition_title)) between 1 and 500
  ),
  constraint copies_note_length check (note is null or char_length(note) <= 10000)
);

comment on column public.copies.user_id is
  'Owner. Never client-trusted: copies_set_user_id overwrites it from the parent work on every insert/update.';
comment on column public.copies.volume_coverage is
  'Series volumes this physical copy contains, e.g. {1,2,3} for an omnibus. NULL = the work''s own series position. UI arrives in Phase 6.';
comment on column public.copies.cover_url is 'Cover image URL. Populated from Phase 4 on.';

create index works_user_id_idx on public.works (user_id);
create index copies_user_id_idx on public.copies (user_id);
create index copies_work_id_idx on public.copies (work_id);
create index copies_user_id_created_at_idx on public.copies (user_id, created_at desc);

-- ---------------------------------------------------------------------------------------------------
-- Trigger functions
-- ---------------------------------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger works_set_updated_at
  before update on public.works
  for each row execute function public.set_updated_at();

create trigger copies_set_updated_at
  before update on public.copies
  for each row execute function public.set_updated_at();

-- Runs with the caller's rights on purpose: the lookup goes through the caller's RLS, so another user's
-- work is invisible and gets the same error as a missing one (no existence oracle).
create function public.copies_set_user_id()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select w.user_id into v_owner from public.works w where w.id = new.work_id;
  if v_owner is null then
    raise exception 'work not found' using errcode = '23503';
  end if;
  new.user_id := v_owner;
  return new;
end;
$$;

create trigger copies_set_user_id_trigger
  before insert or update on public.copies
  for each row execute function public.copies_set_user_id();

-- ---------------------------------------------------------------------------------------------------
-- Row Level Security (enabled in the same migration that creates the tables)
-- ---------------------------------------------------------------------------------------------------
alter table public.works enable row level security;
alter table public.copies enable row level security;

create policy "works_select_own" on public.works
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "works_insert_own" on public.works
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "works_update_own" on public.works
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "works_delete_own" on public.works
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "copies_select_own" on public.copies
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "copies_insert_own" on public.copies
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "copies_update_own" on public.copies
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "copies_delete_own" on public.copies
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Supabase grants new tables to anon by default; take that away.
revoke all on table public.works from anon;
revoke all on table public.copies from anon;
grant select, insert, update, delete on table public.works to authenticated;
grant select, insert, update, delete on table public.copies to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Atomic add / delete
-- ---------------------------------------------------------------------------------------------------

-- ADD-02 foundation: a work and its first copy in one transaction (a function call is one transaction).
create function public.create_work_with_copy(
  p_title text,
  p_authors text[],
  p_genre text,
  p_series text,
  p_series_position numeric,
  p_format text,
  p_publisher text,
  p_edition_title text,
  p_note text
)
returns table (new_work_id uuid, new_copy_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_work_id uuid;
  v_copy_id uuid;
begin
  insert into public.works as w (title, authors, genre, series, series_position)
  values (p_title, coalesce(p_authors, '{}'), p_genre, p_series, p_series_position)
  returning w.id into v_work_id;

  insert into public.copies as c (work_id, format, publisher, edition_title, note)
  values (v_work_id, p_format, p_publisher, p_edition_title, p_note)
  returning c.id into v_copy_id;

  return query select v_work_id, v_copy_id;
end;
$$;

-- Deletes one copy and, when it was the work's last copy, the work too, so a work never lingers with zero
-- copies. Idempotent: a copy that is not visible to the caller (missing or foreign) yields false, false, null.
create function public.delete_copy(p_copy_id uuid)
returns table (copy_deleted boolean, work_deleted boolean, parent_work_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_work_id uuid;
  v_rows integer;
  v_remaining bigint;
begin
  select c.work_id into v_work_id from public.copies c where c.id = p_copy_id;
  if v_work_id is null then
    return query select false, false, null::uuid;
    return;
  end if;

  -- Serialises with a concurrent "add copy to this work" (its FK check takes a conflicting row lock).
  perform 1 from public.works w where w.id = v_work_id for update;

  delete from public.copies c where c.id = p_copy_id;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return query select false, false, v_work_id;
    return;
  end if;

  select count(*) into v_remaining from public.copies c where c.work_id = v_work_id;
  if v_remaining = 0 then
    delete from public.works w where w.id = v_work_id;
    return query select true, true, v_work_id;
  else
    return query select true, false, v_work_id;
  end if;
end;
$$;

-- Callable by signed-in users only. Supabase also grants execute to anon through default privileges, so
-- anon is revoked explicitly in addition to public.
revoke execute on function public.create_work_with_copy(text, text[], text, text, numeric, text, text, text, text)
  from public, anon;
grant execute on function public.create_work_with_copy(text, text[], text, text, numeric, text, text, text, text)
  to authenticated;

revoke execute on function public.delete_copy(uuid) from public, anon;
grant execute on function public.delete_copy(uuid) to authenticated;

-- Trigger functions are never called directly.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.copies_set_user_id() from public, anon, authenticated;
