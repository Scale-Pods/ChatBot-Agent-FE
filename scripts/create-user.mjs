#!/usr/bin/env node
/**
 * Create an agent user (or reset the password if the email already exists).
 *
 * Usage:
 *   node scripts/create-user.mjs <email> <password> [name]
 */

import {
  fail,
  getConfig,
  hashPassword,
  rest,
  usersPath,
  verifyHash,
} from "./_supabase.mjs"

const [emailArg, password, nameArg] = process.argv.slice(2)

if (!emailArg || !password) {
  fail("Usage: node scripts/create-user.mjs <email> <password> [name]")
}

const email = emailArg.trim().toLowerCase()
const name = (nameArg ?? email.split("@")[0]).trim()

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail(`"${email}" is not a valid email address`)
}

const config = getConfig()
const passwordHash = await hashPassword(password)

const existing = await rest(
  config,
  usersPath(config, `select=id,Email&Email=ilike.${encodeURIComponent(email)}&limit=1`)
)

let row

if (existing.length > 0) {
  const id = existing[0].id
  const updated = await rest(config, usersPath(config, `id=eq.${id}`), {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ Password: passwordHash }),
  })

  row = updated[0]
  console.log(`↻ ${email} already existed (id ${id}); password updated instead`)
} else {
  const inserted = await rest(config, usersPath(config), {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ Name: name, Email: email, Password: passwordHash }),
  })

  row = inserted[0]
  console.log(`✔ Created ${email} (id ${row?.id})`)
}

// Read the row back and check the stored hash actually verifies.
const check = await rest(
  config,
  usersPath(config, `select=id,Email,Password&Email=ilike.${encodeURIComponent(email)}&limit=1`)
)

if (check.length === 0) {
  fail("Row disappeared right after writing it — check Supabase permissions")
}

const ok = await verifyHash(password, check[0].Password)
const format = String(check[0].Password).split("$")[0]

console.log(`  table:     ${config.table}`)
console.log(`  project:   ${config.url}`)
console.log(`  hash kind: ${format} (${String(check[0].Password).length} chars)`)
console.log(`  verify:    ${ok ? "password matches stored hash" : "MISMATCH"}`)

if (!ok) process.exit(1)
