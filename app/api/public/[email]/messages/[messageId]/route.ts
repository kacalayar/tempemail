import { createDb } from "@/lib/db"
import { emails, messages } from "@/lib/schema"
import { eq, and, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { isValidAddress } from "@/lib/shared-data"

export const runtime = "edge"

async function resolvePublicEmail(address: string) {
  if (!isValidAddress(address)) return null
  const db = createDb()
  const email = await db.query.emails.findFirst({
    where: sql`LOWER(${emails.address}) = LOWER(${address})`
  })
  if (!email || !email.isPublic || email.expiresAt < new Date()) return null
  return email
}

// Public inbox single message detail, keyed by email address.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ email: string; messageId: string }> }
) {
  const { email: address, messageId } = await params
  const db = createDb()

  try {
    const email = await resolvePublicEmail(decodeURIComponent(address))
    if (!email) {
      return NextResponse.json(
        { error: "Public inbox not found or not enabled" },
        { status: 404 }
      )
    }

    const message = await db.query.messages.findFirst({
      where: and(
        eq(messages.id, messageId),
        eq(messages.emailId, email.id)
      )
    })

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: {
        id: message.id,
        from_address: message.fromAddress,
        to_address: message.toAddress,
        subject: message.subject,
        content: message.content,
        html: message.html,
        received_at: message.receivedAt,
        sent_at: message.sentAt
      }
    })
  } catch (error) {
    console.error("Failed to fetch public message:", error)
    return NextResponse.json(
      { error: "Failed to fetch message" },
      { status: 500 }
    )
  }
}