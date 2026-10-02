#!/usr/bin/env node
// Secret scanner for the build output and for git history (T-01-07-01/02/03). No dependencies.
//
//   node scripts/check-secrets.mjs <dir>         scan *.js, *.html, *.css, *.map, *.json under <dir>
//   node scripts/check-secrets.mjs --git-history scan `git log -p --all`, every tracked file, and refuse data/ in history
//
// Findings are reported as `location: kind` lines only. The matched value is never printed.
// Exit code 1 on any finding, 0 otherwise.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCANNED_EXTENSIONS = new Set(['.js', '.html', '.css', '.map', '.json'])

// Gitignored local files whose values must never appear anywhere that is built or pushed.
const LOCAL_ENV_FILES = ['.env.test.local', '.env.supabase.local']
const LOCAL_SECRET_NAMES = ['TEST_SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DEV_DB_PASSWORD', 'SUPABASE_PROD_DB_PASSWORD']
const MIN_LOCAL_SECRET_LENGTH = 12

const SECRET_KEY_PATTERN = /sb_secret_[A-Za-z0-9_-]{10,}/
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]*/g

const KIND_SECRET_KEY = 'sb_secret_ key'
const KIND_SERVICE_ROLE_JWT = 'service_role JWT'

// Same decode rule as src/lib/client-key.ts: the role claim of the base64url payload.
function jwtRole(payloadSegment) {
  try {
    const decoded = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString('utf8'))
    return typeof decoded === 'object' && decoded !== null && typeof decoded.role === 'string' ? decoded.role : null
  } catch {
    return null
  }
}

function loadLocalSecrets() {
  const secrets = []
  for (const file of LOCAL_ENV_FILES) {
    let content
    try {
      content = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8')
    } catch {
      continue
    }
    for (const rawLine of content.split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(rawLine)
      if (!match || !LOCAL_SECRET_NAMES.includes(match[1])) continue
      const value = match[2].replace(/^(['"])(.*)\1$/, '$2')
      if (value.length >= MIN_LOCAL_SECRET_LENGTH) secrets.push({ name: match[1], value })
    }
  }
  return secrets
}

// Returns the finding kinds present in one chunk of text (a line or a whole file).
function findKinds(text, localSecrets) {
  const kinds = new Set()
  if (text.includes('sb_secret_') && new RegExp(SECRET_KEY_PATTERN, 'g').test(text)) kinds.add(KIND_SECRET_KEY)
  if (text.includes('eyJ')) {
    for (const match of text.matchAll(JWT_PATTERN)) {
      if (jwtRole(match[1]) === 'service_role') kinds.add(KIND_SERVICE_ROLE_JWT)
    }
  }
  for (const { name, value } of localSecrets) {
    if (text.includes(value)) kinds.add(`local secret value (${name})`)
  }
  return kinds
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (entry.isFile() && SCANNED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(full)
  }
  return files
}

function git(args) {
  const result = spawnSync('git', ['-c', 'core.quotepath=false', ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
  })
  if (result.status !== 0) {
    console.error(`git ${args[0]} failed (exit ${result.status})`)
    process.exit(2)
  }
  return result.stdout
}

function report(findings, scannedFiles) {
  if (findings.size > 0) {
    for (const finding of [...findings].sort()) console.error(finding)
    console.error(`${findings.size} secret finding(s); values are intentionally not shown`)
    process.exit(1)
  }
  console.log(`no secrets found in ${scannedFiles} files`)
}

function scanDirectory(dir) {
  const root = path.resolve(dir)
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error(`not a directory: ${dir}`)
    process.exit(2)
  }
  const localSecrets = loadLocalSecrets()
  const findings = new Set()
  const files = walk(root)
  for (const file of files) {
    const relative = path.relative(root, file).split(path.sep).join('/')
    for (const kind of findKinds(fs.readFileSync(file, 'utf8'), localSecrets)) findings.add(`${relative}: ${kind}`)
  }
  report(findings, files.length)
}

function scanGitHistory() {
  const localSecrets = loadLocalSecrets()
  const findings = new Set()

  // Personal data (the author's library under data/) must never have been committed on any ref.
  const dataPaths = new Set(
    git(['log', '--all', '--name-only', '--format=', '--', 'data/']).split('\n').filter(Boolean),
  )
  for (const dataPath of dataPaths) findings.add(`history: ${dataPath}: personal data path under data/`)

  // Every added and removed line of every commit on every ref.
  let commit = ''
  let file = ''
  for (const line of git(['log', '-p', '--all']).split('\n')) {
    if (/^commit [0-9a-f]{40}/.test(line)) {
      commit = line.slice(7, 19)
      file = ''
    } else if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
      file = line.slice(6).trimEnd()
    } else {
      for (const kind of findKinds(line, localSecrets)) findings.add(`commit ${commit} ${file}: ${kind}`)
    }
  }

  // The current working copy of every tracked file.
  const tracked = git(['ls-files', '-z']).split('\0').filter(Boolean)
  for (const trackedFile of tracked) {
    if (trackedFile.startsWith('data/')) findings.add(`${trackedFile}: tracked personal data path under data/`)
    let content
    try {
      content = fs.readFileSync(path.join(REPO_ROOT, trackedFile), 'utf8')
    } catch {
      continue
    }
    for (const kind of findKinds(content, localSecrets)) findings.add(`${trackedFile}: ${kind}`)
  }
  report(findings, tracked.length)
}

const args = process.argv.slice(2)
if (args.length === 1 && args[0] === '--git-history') {
  scanGitHistory()
} else if (args.length === 1 && !args[0].startsWith('--')) {
  scanDirectory(args[0])
} else {
  console.error('usage: node scripts/check-secrets.mjs <dir> | --git-history')
  process.exit(2)
}
