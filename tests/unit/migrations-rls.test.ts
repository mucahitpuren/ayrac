// AUTH-07 static gate: every migration-created table must have RLS, all four policies and no anon access,
// and every RPC function must be SECURITY INVOKER with a pinned search_path and no anon/public execute.
// No network. A table or function added in any later migration is checked here automatically.
import { describe, expect, it } from 'vitest'
import { rpcFunctions, schemaTables, tableSecurity } from '../setup/schema-tables'

const ALL_COMMANDS = ['delete', 'insert', 'select', 'update']

// Tables whose policies are intentionally not owner-scoped (world-readable reference data and the like).
// Adding a name here is a deliberate, reviewed act; every table so far is private to its owner.
const INTENTIONALLY_UNSCOPED_TABLES: string[] = []

describe('migration parser (current migrations)', () => {
  it('finds exactly the works and copies tables, sorted', () => {
    expect(schemaTables()).toEqual(['copies', 'works'])
  })

  it.each(['works', 'copies'])('reports %s as fully hardened', (table) => {
    const security = tableSecurity(table)
    expect(security.rlsEnabled).toBe(true)
    expect([...security.policies].sort()).toEqual(ALL_COMMANDS)
    expect(security.anonRevoked).toBe(true)
    expect(security.unscopedPolicies).toEqual([])
  })

  it.each(['create_work_with_copy', 'delete_copy'])('lists %s with every hardening flag set', (name) => {
    const fn = rpcFunctions().find((candidate) => candidate.name === name)
    expect(fn, `${name} not found`).toBeDefined()
    expect(fn).toMatchObject({
      securityInvoker: true,
      searchPathSet: true,
      revokedFromAnon: true,
      revokedFromPublic: true,
    })
  })

  it('does not list trigger functions as RPCs', () => {
    const names = rpcFunctions().map((fn) => fn.name)
    expect(names).not.toContain('set_updated_at')
    expect(names).not.toContain('copies_set_user_id')
  })
})

describe('the gate can fail (synthetic migrations)', () => {
  it('reports a table created without enable row level security', () => {
    const sql = `
      create table public.notes (id uuid primary key, user_id uuid not null);
      create policy "notes_select" on public.notes for select to authenticated using (true);
      revoke all on table public.notes from anon;
    `
    expect(schemaTables(sql)).toEqual(['notes'])
    expect(tableSecurity('notes', sql).rlsEnabled).toBe(false)
  })

  it('reports missing policies and a missing anon revoke', () => {
    const sql = `
      create table public.notes (id uuid primary key);
      alter table public.notes enable row level security;
      create policy "notes_select" on public.notes for select to authenticated using (true);
      create policy "notes_insert" on public.notes for insert to authenticated with check (true);
    `
    const security = tableSecurity('notes', sql)
    expect(security.rlsEnabled).toBe(true)
    expect([...security.policies].sort()).toEqual(['insert', 'select'])
    expect(security.anonRevoked).toBe(false)
  })

  it('treats a policy for all as covering the four commands and a later disable as no RLS', () => {
    const covered = `
      create table public.notes (id uuid primary key);
      alter table public.notes enable row level security;
      create policy "notes_all" on public.notes for all to authenticated using (true);
      revoke all on table public.notes from anon;
    `
    expect([...tableSecurity('notes', covered).policies].sort()).toEqual(ALL_COMMANDS)
    const disabled = `${covered} alter table public.notes disable row level security;`
    expect(tableSecurity('notes', disabled).rlsEnabled).toBe(false)
  })

  it('reports policies whose predicate is not an owner check', () => {
    const sql = `
      create table public.notes (id uuid primary key, user_id uuid not null);
      alter table public.notes enable row level security;
      create policy "notes_select" on public.notes for select to authenticated using (true);
      create policy "notes_insert" on public.notes for insert to authenticated with check (true);
      create policy "notes_update" on public.notes for update to authenticated
        using ((select auth.uid()) = user_id) with check (true);
      create policy "notes_delete" on public.notes for delete to authenticated using ((select auth.uid()) is not null);
      create policy "notes_insert_no_check" on public.notes for insert to authenticated;
    `
    expect(tableSecurity('notes', sql).unscopedPolicies).toEqual([
      'notes_select',
      'notes_insert',
      'notes_update',
      'notes_delete',
      'notes_insert_no_check',
    ])
  })

  it('accepts owner checks in either order, with or without the select wrapper, and an update with only using', () => {
    const sql = `
      create table public.notes (id uuid primary key, user_id uuid not null);
      alter table public.notes enable row level security;
      create policy "a" on public.notes for select to authenticated using ((select auth.uid()) = user_id);
      create policy "b" on public.notes for select to authenticated using (user_id = (select auth.uid()));
      create policy "c" on public.notes for delete to authenticated using (auth.uid() = notes.user_id);
      create policy "d" on public.notes for insert to authenticated with check ((select auth.uid()) = user_id);
      create policy "e" on public.notes for update to authenticated using ((select auth.uid()) = user_id);
      create policy "f" on public.notes for all to authenticated
        using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
    `
    expect(tableSecurity('notes', sql).unscopedPolicies).toEqual([])
  })

  it('reports an anon grant that follows the revoke', () => {
    const sql = `
      create table public.notes (id uuid primary key);
      revoke all on table public.notes from anon;
      grant select on table public.notes to anon;
    `
    expect(tableSecurity('notes', sql).anonRevoked).toBe(false)
  })

  it('reports a function without security invoker, search_path or execute revokes', () => {
    const sql = `
      create function public.leaky(p_id uuid)
      returns boolean
      language plpgsql
      security definer
      as $$
      begin
        return true;
      end;
      $$;
      revoke execute on function public.leaky(uuid) from public;
    `
    const [fn] = rpcFunctions(sql)
    expect(fn).toEqual({
      name: 'leaky',
      securityInvoker: false,
      searchPathSet: false,
      revokedFromAnon: false,
      revokedFromPublic: true,
    })
  })

  it('fails loudly on a function it cannot parse instead of skipping it', () => {
    const sql = `create function public.sneaky() returns int language sql as 'select 1';`
    expect(() => rpcFunctions(sql)).toThrow(/cannot parse/i)
  })

  it('accepts create table if not exists in the public schema', () => {
    expect(schemaTables('create table if not exists public."notes" (id int);')).toEqual(['notes'])
  })

  it('fails loudly on a table outside the public schema', () => {
    expect(() => schemaTables('create table private.secrets (id int);')).toThrow(/public/i)
  })
})

describe('AUTH-07 hardening of every migrated table and function', () => {
  const tables = schemaTables()
  const functions = rpcFunctions()

  it('has something to check', () => {
    expect(tables.length).toBeGreaterThan(0)
    expect(functions.length).toBeGreaterThan(0)
  })

  it.each(tables)('table %s: RLS enabled, select/insert/update/delete policies, anon revoked', (table) => {
    const security = tableSecurity(table)
    expect(security.rlsEnabled, `${table}: row level security is not enabled`).toBe(true)
    expect([...security.policies].sort(), `${table}: missing policy`).toEqual(ALL_COMMANDS)
    expect(security.anonRevoked, `${table}: not revoked from anon`).toBe(true)
    if (!INTENTIONALLY_UNSCOPED_TABLES.includes(table)) {
      expect(security.unscopedPolicies, `${table}: policy is not scoped to auth.uid() = user_id`).toEqual([])
    }
  })

  it.each(functions.map((fn) => fn.name))('function %s: INVOKER, search_path set, no anon/public execute', (name) => {
    const fn = functions.find((candidate) => candidate.name === name)
    expect(fn?.securityInvoker, `${name}: not SECURITY INVOKER`).toBe(true)
    expect(fn?.searchPathSet, `${name}: search_path not set`).toBe(true)
    expect(fn?.revokedFromAnon, `${name}: execute not revoked from anon`).toBe(true)
    expect(fn?.revokedFromPublic, `${name}: execute not revoked from public`).toBe(true)
  })
})
