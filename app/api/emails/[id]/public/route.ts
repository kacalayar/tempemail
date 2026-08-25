import { NextResponse } from "next/server"
import { createDb } from "@/lib/db"
import { emails } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { getUserId } from "@/lib/apiKey"
import { z } from "zod"

export const runtime = "edge"

const bodySchema = z.object({
  isPublic: z.boolean()
})

// Toggle public-by-address inbox access for an owned email.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null))
  if (!body.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 })
  }

  const { id } = await params
  const db = createDb()

  // Ownership check: only the email's owner may toggle public access.
  const email = await db.query.emails.findFirst({
    where: and(eq(emails.id, id), eq(emails.userId, userId))
  })

  if (!email) {
    return NextResponse.json({ error: "邮箱不存在或无权限" }, { status: 403 })
  }

  await db.update(emails)
    .set({ isPublic: body.data.isPublic })
    .where(eq(emails.id, id))

  return NextResponse.json({ success: true, isPublic: body.data.isPublic })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }

  const { id } = await params
  const db = createDb()

  const email = await db.query.emails.findFirst({
    where: and(eq(emails.id, id), eq(emails.userId, userId))
  })

  if (!email) {
    return NextResponse.json({ error: "邮箱不存在或无权限" }, { status: 403 })
  }

  return NextResponse.json({ isPublic: email.isPublic })
}