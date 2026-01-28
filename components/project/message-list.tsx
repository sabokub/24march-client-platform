'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'

type SenderMini = {
  id: string
  name?: string | null
  role?: 'admin' | 'client' | null
}

type MessageRow = {
  id: string
  project_id: string
  sender_id: string
  content: string
  created_at: string
  read_by: string[]          // ✅ plus optionnel
  sender?: SenderMini[] | null
}

type Props = {
  projectId: string
  currentUserId: string
}

function initials(name?: string | null) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}

function sameDay(aISO: string, bISO: string) {
  const a = new Date(aISO)
  const b = new Date(bISO)
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function minutesBetween(aISO: string, bISO: string) {
  return Math.abs(new Date(aISO).getTime() - new Date(bISO).getTime()) / 60000
}

function computeGrouping(messages: MessageRow[], currentUserId: string) {
  return messages.map((m, idx) => {
    const prev = messages[idx - 1]
    const next = messages[idx + 1]

    const sameSenderPrev =
      !!prev &&
      prev.sender_id === m.sender_id &&
      sameDay(prev.created_at, m.created_at) &&
      minutesBetween(prev.created_at, m.created_at) <= 5

    const sameSenderNext =
      !!next &&
      next.sender_id === m.sender_id &&
      sameDay(next.created_at, m.created_at) &&
      minutesBetween(next.created_at, m.created_at) <= 5

    const showDayDivider = !prev || !sameDay(prev.created_at, m.created_at)
    const showTime = !sameSenderNext
    const isMe = m.sender_id === currentUserId
    const showAvatar = !isMe && !sameSenderPrev && m.sender?.[0]?.role === 'client'

    return { m, isMe, sameSenderPrev, showDayDivider, showTime, showAvatar }
  })
}

export function MessageList({ projectId, currentUserId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const bottomRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<MessageRow[]>([])
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const [peerTyping, setPeerTyping] = useState(false)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingChannelRef = useRef<any>(null)

  const [currentRole, setCurrentRole] = useState<'admin' | 'client' | null>(null)

  const scrollBottom = (smooth = true) =>
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' }),
      0
    )

  async function fetchCurrentRole() {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUserId)
      .single()
    setCurrentRole((data?.role as any) ?? null)
  }

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('id, project_id, sender_id, content, created_at, read_by, sender:profiles(id, name, role)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    setMessages(
  (data ?? []).map((m) => ({
    ...m,
    read_by: m.read_by ?? [],
  })) as MessageRow[]
)
  }

  async function markAsRead() {
    await supabase.rpc('mark_project_read', {
      p_project_id: projectId,
      p_user_id: currentUserId,
    })
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      await Promise.all([fetchCurrentRole(), fetchMessages()])
      await markAsRead()
      if (!alive) return
      setLoading(false)
      scrollBottom(false)
    })()
    return () => {
      alive = false
    }
  }, [projectId, currentUserId])

  useEffect(() => {
    const ch = supabase
      .channel(`messages:${projectId}`)
      .on(
  'postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${projectId}` },
        async () => {
          await fetchMessages()
          await markAsRead()
          scrollBottom(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [supabase, projectId, currentUserId])

  useEffect(() => {
    const typingChannel = supabase.channel(`typing:${projectId}`, {
      config: { presence: { key: currentUserId } },
    })

    typingChannelRef.current = typingChannel

    typingChannel.on('presence', { event: 'sync' }, () => {
      const state = typingChannel.presenceState() as Record<string, any[]>
      const someoneTyping = Object.entries(state)
        .filter(([k]) => k !== currentUserId)
        .some(([, p]) => p?.some((x) => x?.typing))
      setPeerTyping(someoneTyping)
    })

    typingChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await typingChannel.track({ typing: false })
    })

    return () => {
      supabase.removeChannel(typingChannel)
      typingChannelRef.current = null
    }
  }, [supabase, projectId, currentUserId])

  async function setTyping(typing: boolean) {
    if (!typingChannelRef.current) return
    await typingChannelRef.current.track({ typing })
  }

  async function sendMessage() {
    const content = value.trim()
    if (!content) return

    setSending(true)

    const { error } = await supabase.from('messages').insert({
      project_id: projectId,
      sender_id: currentUserId,
      content,
      read_by: [], // ✅ NOT NULL
    })

    if (error) {
      console.error(error)
      setSending(false)
      return
    }

    await fetchMessages()
    scrollBottom(true)

    setValue('')
    await setTyping(false)
    setSending(false)
  }

  const ui = useMemo(() => computeGrouping(messages, currentUserId), [messages, currentUserId])

  const lastMyMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_id === currentUserId) return messages[i].id
    }
    return null
  }, [messages, currentUserId])

  const peerUserId = useMemo(() => {
    const other = messages.find((m) => m.sender_id !== currentUserId)
    return other?.sender_id ?? null
  }, [messages, currentUserId])

  const lastMyMessageRead = useMemo(() => {
    if (!lastMyMessageId || !peerUserId) return false
    const msg = messages.find((m) => m.id === lastMyMessageId)
    return !!msg && msg.read_by.includes(peerUserId)
  }, [messages, lastMyMessageId, peerUserId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[520px] rounded-2xl overflow-hidden border bg-gray-50/50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {ui.map(({ m, isMe, sameSenderPrev, showDayDivider, showTime, showAvatar }) => {
              const dayLabel = format(new Date(m.created_at), 'dd MMMM yyyy', { locale: fr })

              return (
                <motion.div key={m.id} className="flex flex-col gap-2">
                  {showDayDivider && (
                    <div className="flex justify-center">
                      <span className="text-[11px] text-gray-400">{dayLabel}</span>
                    </div>
                  )}

                  <div className={clsx('flex gap-2', isMe ? 'justify-end' : 'justify-start')}>
                    {!isMe && showAvatar ? (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{initials(m.sender?.[0]?.name)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      !isMe && <div className="w-8" />
                    )}

                    <div className="max-w-[75%]">
                      <div
  className={clsx(
    'px-4 py-2 rounded-2xl shadow-sm',
    isMe
      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
      : 'bg-white border border-gray-200 text-gray-900'
  )}
  >{m.content}</div>
                      {showTime && (
                        <div className="text-[11px] text-gray-400 mt-1 text-right">
                          {new Date(m.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                      {isMe && m.id === lastMyMessageId && (
                        <div className="text-[11px] text-gray-400 mt-1">
                          {lastMyMessageRead ? 'Vu' : 'Envoyé'}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {peerTyping && <div className="text-sm text-gray-400">Écrit…</div>}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3 bg-white">
        <div className="flex gap-3 items-end">
          <Textarea
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setTyping(true)
              if (typingTimer.current) clearTimeout(typingTimer.current)
              typingTimer.current = setTimeout(() => setTyping(false), 900)
            }}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
          />
          <Button onClick={sendMessage} disabled={sending || !value.trim()}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        <div className="mt-2 text-[11px] text-gray-400">
          {currentRole === 'admin'
            ? 'Mode Admin (Décoratrice)'
            : currentRole === 'client'
            ? 'Mode Client'
            : ''}
        </div>
      </div>
    </div>
  )
}
