// Parser over supabase/migrations/*.sql. STUB (RED phase): returns "nothing found" for everything.
export interface TableSecurity {
  rlsEnabled: boolean
  policies: Set<'select' | 'insert' | 'update' | 'delete'>
  anonRevoked: boolean
}

export interface RpcFunction {
  name: string
  securityInvoker: boolean
  searchPathSet: boolean
  revokedFromAnon: boolean
  revokedFromPublic: boolean
}

export function schemaTables(sql?: string): string[] {
  void sql
  return []
}

export function tableSecurity(table: string, sql?: string): TableSecurity {
  void table
  void sql
  return { rlsEnabled: false, policies: new Set(), anonRevoked: false }
}

export function rpcFunctions(sql?: string): RpcFunction[] {
  void sql
  return []
}
