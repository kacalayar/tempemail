import { getPublicEmail, getPublicEmailMessages } from "@/lib/shared-data"
import { SharedErrorPage } from "@/components/emails/shared-error-page"
import { SharedEmailPageClient } from "@/components/emails/public-inbox-client"

interface PageProps {
  params: Promise<{
    email: string
    locale: string
  }>
}

export const runtime = "edge"

export default async function PublicInboxPage({ params }: PageProps) {
  const { email: rawEmail } = await params
  const address = decodeURIComponent(rawEmail)

  // Server-side fetch + authorization gate (isPublic + expiry).
  const email = await getPublicEmail(address)

  if (!email) {
    return (
      <SharedErrorPage
        titleKey="emailNotFound"
        subtitleKey="linkExpired"
        errorKey="linkInvalid"
        descriptionKey="linkInvalidDescription"
        ctaTextKey="createOwnEmail"
      />
    )
  }

  const messagesResult = await getPublicEmailMessages(address)

  return (
    <SharedEmailPageClient
      email={email}
      initialMessages={messagesResult.messages}
      initialNextCursor={messagesResult.nextCursor}
      initialTotal={messagesResult.total}
      fetchBase={`/api/public/${encodeURIComponent(address)}`}
    />
  )
}