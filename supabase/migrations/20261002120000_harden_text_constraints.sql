-- Server-side limits that the client form already assumes (src/features/book/book-form.ts) but the init
-- migration did not enforce:
--   works.authors          every element non-null, 1..200 characters after btrim (the init migration only
--                          capped the element count, so '{NULL}' or '{""}' was storable and a NULL element
--                          would throw in the client's work picker)
--   copies.cover_url       an https URL without whitespace, at most 2048 characters (it ends up in <img src>)
--   copies.volume_coverage 1..50 positive volume numbers, no NULL elements
--
-- A CHECK expression cannot contain a subquery, so the per-element rules live in two small immutable SQL
-- functions. They follow the same hardening as every other public function (SECURITY INVOKER, empty
-- search_path, no anon/public execute); authenticated keeps execute because Postgres checks the caller's
-- EXECUTE privilege when a CHECK constraint that calls a function is evaluated.
--
-- Existing rows: ADD CONSTRAINT validates every row and fails the whole migration (nothing is changed) if one
-- violates a rule. Rows written through the app already satisfy them (the form trims authors and caps them at
-- 200 characters, cover_url and volume_coverage have no writer yet), so the constraints are added validated,
-- not NOT VALID.

create function public.is_valid_authors(p_authors text[])
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select not exists (
    select 1 from unnest(p_authors) as a(name)
    where a.name is null or char_length(btrim(a.name)) not between 1 and 200
  )
$$;

create function public.is_valid_volume_coverage(p_volumes numeric[])
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select cardinality(p_volumes) between 1 and 50
    and not exists (
      select 1 from unnest(p_volumes) as v(n)
      where v.n is null or v.n <= 0
    )
$$;

revoke execute on function public.is_valid_authors(text[]) from public, anon;
grant execute on function public.is_valid_authors(text[]) to authenticated;

revoke execute on function public.is_valid_volume_coverage(numeric[]) from public, anon;
grant execute on function public.is_valid_volume_coverage(numeric[]) to authenticated;

alter table public.works
  add constraint works_authors_valid check (public.is_valid_authors(authors));

alter table public.copies
  add constraint copies_cover_url_check check (
    cover_url is null or (char_length(cover_url) <= 2048 and cover_url ~ '^https://[^[:space:]]+$')
  ),
  add constraint copies_volume_coverage_valid check (
    volume_coverage is null or public.is_valid_volume_coverage(volume_coverage)
  );
