import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { i18n, type Locale } from "@/i18n/config"

export const runtime = "edge"

// Root-level inbox route: redirect to the locale-prefixed inbox.
// Middleware's locale redirect skips paths containing a dot, and email
// addresses always do, so we resolve the locale here ourselves.
export default async function InboxRedirectPage({
  params,
}: {
  params: Promise<{ email: string }>
}) {
  const { email } = await params
  const headersList = await headers()
  const cookieLocale = headersList
    .get("cookie")
    ?.match(/NEXT_LOCALE=([^;]+)/)?.[1]
  const acceptLanguage = headersList.get("accept-language")

  let locale: Locale = i18n.defaultLocale
  if (cookieLocale && i18n.locales.includes(cookieLocale as Locale)) {
    locale = cookieLocale as Locale
  } else if (acceptLanguage) {
    const candidates = acceptLanguage
      .split(",")
      .map((part) => part.trim().split(";")[0].toLowerCase())
    for (const lang of candidates) {
      const base = lang.split("-")[0]
      const match =
        i18n.locales.find((l) => l.toLowerCase() === lang) ||
        i18n.locales.find((l) => l.toLowerCase().split("-")[0] === base)
      if (match) {
        locale = match
        break
      }
    }
  }

  redirect(`/${locale}/inbox/${email}`)
}