"use client"

import { useDeferredValue, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { CreateDialog } from "./create-dialog"
import { ShareDialog } from "./share-dialog"
import { Mail, RefreshCw, Search, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useThrottle } from "@/hooks/use-throttle"
import { EMAIL_CONFIG } from "@/config"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ROLES } from "@/lib/permissions"
import { useUserRole } from "@/hooks/use-user-role"
import { useConfig } from "@/hooks/use-config"
import { Input } from "@/components/ui/input"
import { mergeRefreshedEmails, normalizeEmailSearchQuery } from "@/lib/email-search"

interface Email {
  id: string
  address: string
  createdAt: number
  expiresAt: number
}

interface EmailListProps {
  onEmailSelect: (email: Email | null) => void
  selectedEmailId?: string
}

interface EmailResponse {
  emails: Email[]
  nextCursor: string | null
  total: number
}

async function requestEmails({ cursor, query }: { cursor?: string, query?: string }) {
  const url = new URL("/api/emails", window.location.origin)
  const normalizedQuery = normalizeEmailSearchQuery(query)

  if (cursor) {
    url.searchParams.set("cursor", cursor)
  }

  if (normalizedQuery) {
    url.searchParams.set("query", normalizedQuery)
  }

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error("Failed to fetch emails")
  }

  return await response.json() as EmailResponse
}

export function EmailList({ onEmailSelect, selectedEmailId }: EmailListProps) {
  const { data: session } = useSession()
  const sessionUserId = session?.user?.id ?? null
  const { config } = useConfig()
  const { role } = useUserRole()
  const t = useTranslations("emails.list")
  const tCommon = useTranslations("common.actions")
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [emailToDelete, setEmailToDelete] = useState<Email | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [hasLoadedSession, setHasLoadedSession] = useState(false)
  const { toast } = useToast()
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const activeSearchQuery = normalizeEmailSearchQuery(deferredSearchQuery)
  const hasSearchQuery = normalizeEmailSearchQuery(searchQuery).length > 0
  const lastLoadedQueryRef = useRef(activeSearchQuery)

  useEffect(() => {
    if (sessionUserId) {
      setHasLoadedSession(true)
    }
  }, [sessionUserId])

  const handleRefresh = async () => {
    setRefreshing(true)

    try {
      const data = await requestEmails({ query: activeSearchQuery })
      setEmails(prev => mergeRefreshedEmails(data.emails, prev))
      setNextCursor(data.nextCursor)
      setTotal(data.total)
    } catch (error) {
      console.error("Failed to fetch emails:", error)
    } finally {
      lastLoadedQueryRef.current = activeSearchQuery
      setRefreshing(false)
    }
  }

  const handleScroll = useThrottle((e: React.UIEvent<HTMLDivElement>) => {
    if (loading || loadingMore || !nextCursor) return

    const { scrollHeight, scrollTop, clientHeight } = e.currentTarget
    const threshold = clientHeight * 1.5
    const remainingScroll = scrollHeight - scrollTop

    if (remainingScroll <= threshold) {
      setLoadingMore(true)
      requestEmails({ cursor: nextCursor, query: activeSearchQuery })
        .then((data) => {
          setEmails(prev => [...prev, ...data.emails])
          setNextCursor(data.nextCursor)
          setTotal(data.total)
        })
        .catch((error) => {
          console.error("Failed to fetch emails:", error)
        })
        .finally(() => {
          setLoadingMore(false)
        })
    }
  }, 200)

  useEffect(() => {
    if (!hasLoadedSession) return

    let cancelled = false
    setLoading(true)
    setLoadingMore(false)

    const timeoutId = window.setTimeout(async () => {
      try {
        const data = await requestEmails({ query: activeSearchQuery })

        if (cancelled) return

        const shouldMergeResults = activeSearchQuery === lastLoadedQueryRef.current

        setEmails(prev => shouldMergeResults ? mergeRefreshedEmails(data.emails, prev) : data.emails)
        setNextCursor(data.nextCursor)
        setTotal(data.total)
        lastLoadedQueryRef.current = activeSearchQuery
      } catch (error) {
        if (cancelled) return
        console.error("Failed to fetch emails:", error)
      } finally {
        if (cancelled) return
        setLoading(false)
        setRefreshing(false)
        setLoadingMore(false)
      }
    }, activeSearchQuery ? 250 : 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [hasLoadedSession, activeSearchQuery])

  const handleDelete = async (email: Email) => {
    try {
      const response = await fetch(`/api/emails/${email.id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const data = await response.json()
        toast({
          title: t("error"),
          description: (data as { error: string }).error,
          variant: "destructive"
        })
        return
      }

      setEmails(prev => prev.filter(e => e.id !== email.id))
      setTotal(prev => prev - 1)

      toast({
        title: t("success"),
        description: t("deleteSuccess")
      })
      
      if (selectedEmailId === email.id) {
        onEmailSelect(null)
      }
    } catch {
      toast({
        title: t("error"),
        description: t("deleteFailed"),
        variant: "destructive"
      })
    } finally {
      setEmailToDelete(null)
    }
  }

  if (!hasLoadedSession) return null

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="border-b border-primary/20 p-2 space-y-2">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                className={cn("h-8 w-8 shrink-0", refreshing && "animate-spin")}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <span className="text-xs text-gray-500 truncate">
                {role === ROLES.EMPEROR ? (
                  t("emailCountUnlimited", { count: total })
                ) : (
                  t("emailCount", { count: total, max: config?.maxEmails || EMAIL_CONFIG.MAX_ACTIVE_EMAILS })
                )}
              </span>
            </div>
            <CreateDialog onEmailCreated={handleRefresh} />
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="h-8 pl-9"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-2" onScroll={handleScroll}>
          {loading ? (
            <div className="text-center text-sm text-gray-500">{t("loading")}</div>
          ) : emails.length > 0 ? (
            <div className="space-y-1">
              {emails.map(email => (
                <div
                  key={email.id}
                  className={cn("flex items-center gap-2 p-2 rounded cursor-pointer text-sm group",
                    "hover:bg-primary/5",
                    selectedEmailId === email.id && "bg-primary/10"
                  )}
                  onClick={() => onEmailSelect(email)}
                >
                  <Mail className="h-4 w-4 text-primary/60" />
                  <div className="truncate flex-1">
                    <div className="font-medium truncate">{email.address}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(email.expiresAt).getFullYear() === 9999 ? (
                        t("permanent")
                      ) : (
                        `${t("expiresAt")}: ${new Date(email.expiresAt).toLocaleString()}`
                      )}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <ShareDialog emailId={email.id} emailAddress={email.address} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEmailToDelete(email)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {loadingMore && (
                <div className="text-center text-sm text-gray-500 py-2">
                  {t("loadingMore")}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-sm text-gray-500">
              {hasSearchQuery ? t("noSearchResults") : t("noEmails")}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!emailToDelete} onOpenChange={() => setEmailToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", { email: emailToDelete?.address || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => emailToDelete && handleDelete(emailToDelete)}
            >
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 
