import assert from "node:assert/strict"

import { isValidAddress } from "./shared-data.ts"

// Trust-boundary check: invalid address shapes must be rejected so they
// never reach the DB lookup, and injection-style payloads fail too.
assert.equal(isValidAddress("alex.anderson.1234@example.com"), true)
assert.equal(isValidAddress("user@domain.com"), true)

assert.equal(isValidAddress("not-an-email"), false)
assert.equal(isValidAddress("noatsign.com"), false)
assert.equal(isValidAddress("a@b"), false) // no TLD
assert.equal(isValidAddress(""), false)
assert.equal(isValidAddress(" " as string), false)
assert.equal(isValidAddress(null as unknown as string), false)
assert.equal(isValidAddress("a@b.c' OR 1=1--"), false) // SQL-injection-shaped input
assert.equal(isValidAddress("a@b.c\n"), false) // trailing whitespace

console.log("public-inbox self-check OK")