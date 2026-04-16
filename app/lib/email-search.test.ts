import assert from "node:assert/strict"

import {
  buildEmailSearchLikePattern,
  mergeRefreshedEmails,
  normalizeEmailSearchQuery,
} from "./email-search.ts"

assert.equal(normalizeEmailSearchQuery("  hello@example.com  "), "hello@example.com")

assert.equal(buildEmailSearchLikePattern("   "), null)

assert.equal(
  buildEmailSearchLikePattern(String.raw`100%_real\mail`),
  String.raw`%100\%\_real\\mail%`
)

const replacedResults = mergeRefreshedEmails(
  [
    { id: "new-1", address: "new-1@example.com" },
    { id: "new-2", address: "new-2@example.com" },
  ],
  [{ id: "old-1", address: "old-1@example.com" }]
)

assert.deepEqual(replacedResults, [
  { id: "new-1", address: "new-1@example.com" },
  { id: "new-2", address: "new-2@example.com" },
])

const mergedResults = mergeRefreshedEmails(
  [
    { id: "new-1", address: "new-1@example.com" },
    { id: "existing-1", address: "existing-1@example.com" },
    { id: "existing-2", address: "existing-2@example.com" },
  ],
  [
    { id: "existing-1", address: "existing-1@example.com" },
    { id: "existing-2", address: "existing-2@example.com" },
    { id: "existing-3", address: "existing-3@example.com" },
  ]
)

assert.deepEqual(mergedResults, [
  { id: "new-1", address: "new-1@example.com" },
  { id: "existing-1", address: "existing-1@example.com" },
  { id: "existing-2", address: "existing-2@example.com" },
  { id: "existing-3", address: "existing-3@example.com" },
])

console.log("email-search tests passed")
