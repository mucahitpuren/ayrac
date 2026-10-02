// Parser over supabase/migrations/*.sql. It is deliberately a conservative regex reader, not a SQL parser:
// anything it cannot understand (a function body style, a table outside the public schema) throws instead of
// being skipped, so an unparsed object can never silently pass the AUTH-07 gate.
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export type PolicyCommand = 'select' | 'insert' | 'update' | 'delete'

export interface TableSecurity {
  rlsEnabled: boolean
  policies: Set<PolicyCommand>
  /** Names of policies whose USING / WITH CHECK is missing or is not an owner check (auth.uid() = user_id). */
  unscopedPolicies: string[]
  anonRevoked: boolean
}

export interface RpcFunction {
  name: string
  securityInvoker: boolean
  searchPathSet: boolean
  revokedFromAnon: boolean
  revokedFromPublic: boolean
}

const MIGRATIONS_DIR = fileURLToPath(new URL('../../supabase/migrations/', import.meta.url))
const COMMANDS: PolicyCommand[] = ['select', 'insert', 'update', 'delete']

// All migrations in filename (= timestamp) order, as one string.
function migrationsSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(MIGRATIONS_DIR + file, 'utf8'))
    .join('\n')
}

// Drops -- and /* */ comments and un-quotes plain identifiers ("public"."works" -> public.works).
function normalize(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/"([A-Za-z_]\w*)"/g, '$1')
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function rolesOf(list: string): string[] {
  return list.split(',').map((role) => role.trim().toLowerCase())
}

// Roles named by the `to` clause of grant statements on `target` (e.g. "table public.works").
function grantedRoles(sql: string, objectPattern: string): string[] {
  const roles: string[] = []
  const pattern = new RegExp(`grant\\s+[^;]*?\\s+on\\s+${objectPattern}\\s+to\\s+([^;]+);`, 'gi')
  for (const match of sql.matchAll(pattern)) roles.push(...rolesOf(match[1] ?? ''))
  return roles
}

// The text inside the parentheses that follow `keyword` in a policy body, or null when the clause is absent.
function clauseOf(body: string, keyword: RegExp): string | null {
  const start = keyword.exec(body)
  if (!start) return null
  let depth = 0
  const from = start.index + start[0].length
  for (let index = from; index < body.length; index += 1) {
    const char = body[index]
    if (char === '(') depth += 1
    else if (char === ')') {
      if (depth === 0) return body.slice(from, index)
      depth -= 1
    }
  }
  throw new Error(`Unbalanced parentheses in policy clause: "${body.trim()}"`)
}

// An owner check compares auth.uid() with the user_id column, in either order. `using (true)` and
// `auth.uid() is not null` do not qualify: they open every row (or every row of any signed-in user).
const OWNER_CHECK = [
  /auth\.uid\(\)\s*\)?\s*=\s*(?:\w+\.)?user_id\b/i,
  /\b(?:\w+\.)?user_id\s*=\s*\(?\s*(?:select\s+)?auth\.uid\(\)/i,
]

function isOwnerCheck(predicate: string | null): boolean {
  return predicate !== null && OWNER_CHECK.some((pattern) => pattern.test(predicate))
}

export function schemaTables(sql: string = migrationsSql()): string[] {
  const text = normalize(sql)
  const tables = new Set<string>()
  const outside = text.match(
    /create\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?(?!public\.)(?!if\s+not\s+exists)\S+/i,
  )
  if (outside) {
    throw new Error(
      `Table created outside the public schema or unqualified: "${outside[0]}". Qualify it as public.<name>.`,
    )
  }
  for (const match of text.matchAll(/create\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/gi)) {
    tables.add((match[1] ?? '').toLowerCase())
  }
  for (const match of text.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?public\.(\w+)/gi)) {
    tables.delete((match[1] ?? '').toLowerCase())
  }
  return [...tables].sort()
}

export function tableSecurity(table: string, sql: string = migrationsSql()): TableSecurity {
  const text = normalize(sql)
  const name = escapeRegex(table.toLowerCase())

  // Last enable/disable statement wins.
  let rlsEnabled = false
  const rlsPattern = new RegExp(
    `alter\\s+table\\s+(?:only\\s+)?public\\.${name}\\s+(enable|disable)\\s+row\\s+level\\s+security`,
    'gi',
  )
  for (const match of text.matchAll(rlsPattern)) rlsEnabled = (match[1] ?? '').toLowerCase() === 'enable'

  const policies = new Set<PolicyCommand>()
  const unscopedPolicies: string[] = []
  const policyPattern = new RegExp(`create\\s+policy\\s+(\\S+)\\s+on\\s+public\\.${name}\\b([^;]*);`, 'gi')
  for (const match of text.matchAll(policyPattern)) {
    const body = match[2] ?? ''
    const command = body.match(/\bfor\s+(select|insert|update|delete|all)\b/i)?.[1]?.toLowerCase()
    // A policy without a FOR clause applies to ALL commands.
    if (!command || command === 'all') COMMANDS.forEach((each) => policies.add(each))
    else policies.add(command as PolicyCommand)

    // INSERT is governed by WITH CHECK alone; SELECT and DELETE by USING alone; UPDATE and ALL by USING (an
    // absent WITH CHECK falls back to it). Any clause that is present must be an owner check.
    const using = clauseOf(body, /\busing\s*\(/i)
    const withCheck = clauseOf(body, /\bwith\s+check\s*\(/i)
    const governing = command === 'insert' ? withCheck : using
    const scoped =
      isOwnerCheck(governing) && (using === null || isOwnerCheck(using)) && (withCheck === null || isOwnerCheck(withCheck))
    if (!scoped) unscopedPolicies.push(match[1] ?? '')
  }

  let revoked = false
  const revokePattern = /revoke\s+all(?:\s+privileges)?\s+on\s+([^;]*?)\s+from\s+([^;]+);/gi
  for (const match of text.matchAll(revokePattern)) {
    const objects = (match[1] ?? '').toLowerCase()
    const coversTable =
      new RegExp(`\\bpublic\\.${name}\\b`).test(objects) || /all\s+tables\s+in\s+schema\s+public/.test(objects)
    if (coversTable && rolesOf(match[2] ?? '').includes('anon')) revoked = true
  }
  const regranted = grantedRoles(text, `(?:table\\s+)?public\\.${name}`).includes('anon')

  return { rlsEnabled, policies, unscopedPolicies, anonRevoked: revoked && !regranted }
}

export function rpcFunctions(sql: string = migrationsSql()): RpcFunction[] {
  const text = normalize(sql)
  const declared = [...text.matchAll(/create\s+(?:or\s+replace\s+)?function\s+public\.\w+/gi)].length

  // head = name, arguments, returns and leading attributes; body is dollar-quoted; tail = trailing attributes.
  const pattern =
    /create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)\s*\(([^$]*)(\$[A-Za-z_]*\$)[\s\S]*?\3([^;]*);/gi
  const found: RpcFunction[] = []
  let parsed = 0
  for (const match of text.matchAll(pattern)) {
    parsed += 1
    const name = (match[1] ?? '').toLowerCase()
    const attributes = `${match[2] ?? ''} ${match[4] ?? ''}`
    if (/\breturns\s+trigger\b/i.test(attributes)) continue

    const revokedFrom = new Set<string>()
    const revokePattern = new RegExp(
      `revoke\\s+(?:all|execute)(?:\\s+privileges)?\\s+on\\s+function\\s+public\\.${escapeRegex(name)}` +
        '\\s*\\([^)]*\\)\\s+from\\s+([^;]+);',
      'gi',
    )
    for (const revoke of text.matchAll(revokePattern)) rolesOf(revoke[1] ?? '').forEach((role) => revokedFrom.add(role))
    const regranted = grantedRoles(text, `function\\s+public\\.${escapeRegex(name)}\\s*\\([^)]*\\)`)

    found.push({
      name,
      securityInvoker: /\bsecurity\s+invoker\b/i.test(attributes) && !/\bsecurity\s+definer\b/i.test(attributes),
      searchPathSet: /\bset\s+search_path\s*(?:=|to)\s*\S/i.test(attributes),
      revokedFromAnon: revokedFrom.has('anon') && !regranted.includes('anon'),
      revokedFromPublic: revokedFrom.has('public') && !regranted.includes('public'),
    })
  }
  if (parsed !== declared) {
    throw new Error(
      `Cannot parse ${declared - parsed} function definition(s) in public: only dollar-quoted bodies are supported. ` +
        'Rewrite the function with $$ ... $$ so the RLS gate can inspect it.',
    )
  }
  return found
}
