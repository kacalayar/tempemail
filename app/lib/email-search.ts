const LIKE_ESCAPE_PATTERN = /[%_\\]/g

interface EmailWithId {
  id: string
}

export function normalizeEmailSearchQuery(query?: string | null) {
  return query?.trim() ?? ""
}

export function buildEmailSearchLikePattern(query?: string | null) {
  const normalizedQuery = normalizeEmailSearchQuery(query)

  if (!normalizedQuery) {
    return null
  }

  const escapedQuery = normalizedQuery.replace(LIKE_ESCAPE_PATTERN, "\\$&")
  return `%${escapedQuery}%`
}

export function mergeRefreshedEmails<T extends EmailWithId>(incoming: T[], existing: T[]) {
  const lastDuplicateIndex = incoming.findIndex(
    (incomingEmail) => existing.some((existingEmail) => existingEmail.id === incomingEmail.id)
  )

  if (lastDuplicateIndex === -1) {
    return incoming
  }

  const uniqueIncoming = incoming.slice(0, lastDuplicateIndex)
  return [...uniqueIncoming, ...existing]
}
