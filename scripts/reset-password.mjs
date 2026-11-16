#!/usr/bin/env node
/**
 * Reset an agent password in Supabase.
 *
 * scrypt hashes cannot be reversed, so the only way back into an account is to
 * write a fresh hash for a password you choose.
 *
 * Usage:
 *   node scripts/reset-password.mjs <email> <newPassword>
 */

import {
  fail,
  getConfig,
  hashPassword,
  rest,
  usersPath,
  verifyHash,
} from "./_supabase.mjs"

const [emailArg, password] = process.argv.slice(2)

if (!emailArg || !password) {
  fail("Usage: node scripts/reset-password.mjs <email> <newPassword>")
}

const email = emailArg.trim().toLowerCase()
const config = getConfig()
const passwordHash = await hashPassword(password)

const updated = await rest(
  config,
  usersPath(config, `Email=ilike.${encodeURIComponent(email)}`),
  {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ Password: passwordHash }),
  }
)

if (!Array.isArray(updated) || updated.length === 0) {
  fail(`No user found with email ${email} in table "${config.table}"`)
}

for (const row of updated) {
  const ok = await verifyHash(password, row.Password)
  console.log(`✔ Password reset for ${row.Email ?? email} (id ${row.id}) — verify: ${ok}`)
}
