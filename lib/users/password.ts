import "server-only"

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number
) => Promise<Buffer>

const KEY_LENGTH = 64
const PREFIX = "scrypt"

/**
 * Hash a password with a per-user random salt using scrypt.
 * Stored format: `scrypt$<salt base64>$<hash base64>`.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH)

  return `${PREFIX}$${salt.toString("base64")}$${derived.toString("base64")}`
}

export interface PasswordCheck {
  valid: boolean
  /** True when the stored value was plain text and should be hashed. */
  needsRehash: boolean
}

/**
 * Verify a password against a stored hash. Rows created before this dashboard
 * had password hashing may still contain plain text; those are accepted once
 * and the caller can replace them with a hash.
 */
export async function verifyPassword(
  password: string,
  stored: string | null | undefined
): Promise<PasswordCheck> {
  const value = stored ?? ""

  if (!value) return { valid: false, needsRehash: false }

  const [scheme, saltBase64, hashBase64] = value.split("$")

  if (scheme !== PREFIX || !saltBase64 || !hashBase64) {
    const expected = Buffer.from(value, "utf8")
    const provided = Buffer.from(password, "utf8")

    const valid =
      expected.length === provided.length && timingSafeEqual(expected, provided)

    return { valid, needsRehash: valid }
  }

  try {
    const salt = Buffer.from(saltBase64, "base64")
    const expected = Buffer.from(hashBase64, "base64")
    const derived = await scryptAsync(password.normalize("NFKC"), salt, expected.length)

    return {
      valid: expected.length === derived.length && timingSafeEqual(expected, derived),
      needsRehash: false,
    }
  } catch {
    return { valid: false, needsRehash: false }
  }
}
