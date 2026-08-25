import { createDb } from "@/lib/db"
import { emails, messages } from "@/lib/schema"
import { eq, and, lt, or, sql, ne, isNull, desc } from "drizzle-orm"
import { NextResponse } from "next/server"
import { encodeCursor, decodeCursor } from "@/lib/cursor"
import { isValidAddress } from "@/lib/shared-data"

export const runtime = "edge"

const PAGE_SIZE = 20

// Resolve email by address for public inbox access.
// Returns the email only if opted-in (isPublic) and not expired.
async function resolvePublicEmail(address: string) {
  if (!isValidAddress(address)) return null
  const db = createDb()
  const email = await db.query.emails.findFirst({
    where: sql`LOWER(${emails.address}) = LOWER(${address})`
  })
  if (!email || !email.isPublic || email.expiresAt < new Date()) return null
  return email
}

// Public inbox message list, keyed by email address.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  const address = decodeURIComponent((await params).email)
  const db = createDb()
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')

  try {
    const email = await resolvePublicEmail(address)
    if (!email) {
      return NextResponse.json(
        { error: "Public inbox not found or not enabled" },
        { status: 404 }
      )
    }

    // Only received messages, same as the share-token inbox.
    const baseConditions = and(
      eq(messages.emailId, email.id),
      or(
        ne(messages.type, "sent"),
        isNull(messages.type)
      )
    )

    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(baseConditions)
    const totalCount = Number(totalResult[0].count)

    const conditions = [baseConditions]
    if (cursor) {
      const { timestamp, id } = decodeCursor(cursor)
      conditions.push(or(
        lt(messages.receivedAt, new Date(timestamp)),
        and(
          eq(messages.receivedAt, new Date(timestamp)),
          lt(messages.id, id)
        )
      )!)
    }

    const results = await db.query.messages.findMany({
      where: and(...conditions),
      orderBy: [desc(messages.receivedAt), desc(messages.id)],
      limit: PAGE_SIZE + 1
    })

    const hasMore = results.length > PAGE_SIZE
    const nextCursor = hasMore
      ? encodeCursor(results[PAGE_SIZE - 1].receivedAt.getTime(), results[PAGE_SIZE - 1].id)
      : null
    const messageList = hasMore ? results.slice(0, PAGE_SIZE) : results

    return NextResponse.json({
      messages: messageList.map(msg => ({
        id: msg.id,
        from_address: msg.fromAddress,
        to_address: msg.toAddress,
        subject: msg.subject,
        received_at: msg.receivedAt,
        sent_at: msg.sentAt
      })),
      nextCursor,
      total: totalCount
    })
  } catch (error) {
    console.error("Failed to fetch public messages:", error)
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    )
  }
}