'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendMessage, getMessages, markProjectRead } from '@/app/actions/messages'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Loader2, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Profile } from '@/types/database'

type MessageRow = {
  id: string
  project_id: string
  sender_id: string
  content: string
  created_at: string
  read_by?: string[] | null
  sender?: Pick<Profile, 'id' | 'name' | 'role'> | null
}

type Props = {
  projectId: string
  currentUserId: string
  /** pour "Vu / Envoyé" : l’autre personne (client si admin, admin si client) */
  peerUserId: string
  /** pour miroir (admin/client) */
  currentUserRole: 'admin' | 'client'
}

// 🔧 chez toi la table est dans realtime
const MSG_SCHEMA = 'realtime'

function initials(name?: string | null) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}

function isSameDay(aISO: string, bISO: string) {
  const a = new Date(aISO)
  const b = new Date(bISO)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function minutesBetween(aISO: string, bISO: string) {
  const a = new Date(aISO).getTime()
  const b = new Date(bISO).getTime()
  return Math.abs(a - b) / 60000
}

export function MessageThread({ projectId, currentUserId, peerUserId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  // typing indicator via broadcast
  const [peerTyping, setPeerTyping] = useState(false)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }

  const load = async () => {
    const res = await getMessages(projectId)
    if (res.ok) {
      setMessages(res.data as MessageRow[])
      await markProjectRead(projectId)
      setTimeout(() => scrollToBottom(false), 0)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // realtime new/updates messages
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: MSG_SCHEMA, table: 'messages', filter: `project_id=eq.${projectId}` },
        async () => {
          const res = await getMessages(projectId)
          if (res.ok) {
            setMessages(res.data as MessageRow[])
            await markProjectRead(projectId)
            scrollToBottom(true)
          }
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        const from = (payload as any)?.payload?.from as string | undefined
        const isTyping = (payload as any)?.payload?.typing === true
        if (!from || from === currentUserId) return
        setPeerTyping(isTyping)

        if (typingTimer.current) clearTimeout(typingTimer.current)
        if (isTyping) {
          typingTimer.current = setTimeout(() => setPeerTyping(false), 1400)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, projectId, currentUserId])

  const broadcastTyping = (typing: boolean) => {
    supabase.channel(`messages:${projectId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { from: currentUserId, typing },
    })
  }

  const onChange = (v: string) => {
    setValue(v)
    broadcastTyping(true)
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => broadcastTyping(false), 900)
  }

  const handleSend = async () => {
    const content = value.trim()
    if (!content) return

    setSending(true)
    const fd = new FormData()
    fd.append('project_id', projectId)
    fd.append('content', content)

    const res = await sendMessage(fd)
    if (res.ok) {
      setValue('')
      broadcastTyping(false)
      // realtime refresh fera le reste
    }
    setSending(false)
  }

  // UI grouping + day divider + show time on last bubble of group
  const ui = useMemo(() => {
    return messages.map((m, idx) => {
      const prev = messages[idx - 1]
      const next = messages[idx + 1]

      const sameSenderPrev =
        !!prev &&
        prev.sender_id === m.sender_id &&
        isSameDay(prev.created_at, m.created_at) &&
        minutesBetween(prev.created_at, m.created_at) <= 5

      const sameSenderNext =
        !!next &&
        next.sender_id === m.sender_id &&
        isSameDay(next.created_at, m.created_at) &&
        minutesBetween(next.created_at, m.created_at) <= 5

      const showDayDivider = !prev || !isSameDay(prev.created_at, m.created_at)
      const showTime = !sameSenderNext

      const isMe = m.sender_id === currentUserId

      // avatar uniquement pour le client (quand message venant du client)
      const senderRole = m.sender?.role
      const showAvatar = !sameSenderPrev && senderRole === 'client' && !isMe

      return { m, isMe, sameSenderPrev, sameSenderNext, showDayDivider, showTime, showAvatar }
    })
  }, [messages, currentUserId])

  // read receipt: show only under last message I sent
  const lastMyMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_id === currentUserId) return messages[i].id
    }
    return null
  }, [messages, currentUserId])

  const lastMyMessageReadByPeer = useMemo(() => {
    if (!lastMyMessageId) return false
    const msg = messages.find((x) => x.id === lastMyMessageId)
    if (!msg) return false
    return (msg.read_by ?? []).includes(peerUserId)
  }, [messages, lastMyMessageId, peerUserId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[560px]">
      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 flex flex-col">
        <div className="flex flex-col gap-2 mt-auto">
          <AnimatePresence initial={false}>
            {ui.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center py-10 text-gray-500"
              >
                Aucun message. Commencez la conversation !
              </motion.div>
            ) : (
              ui.map(({ m, isMe, showDayDivider, showTime, sameSenderPrev, sameSenderNext, showAvatar }) => {
                const align = isMe ? 'justify-end' : 'justify-start'

                // iMessage-ish corners
                const bubbleRadius = isMe
                  ? [
                      'rounded-2xl',
                      sameSenderPrev ? 'rounded-tr-md' : 'rounded-tr-2xl',
                      sameSenderNext ? 'rounded-br-md' : 'rounded-br-2xl',
                    ].join(' ')
                  : [
                      'rounded-2xl',
                      sameSenderPrev ? 'rounded-tl-md' : 'rounded-tl-2xl',
                      sameSenderNext ? 'rounded-bl-md' : 'rounded-bl-2xl',
                    ].join(' ')

                const bubbleColor = isMe
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                  : 'bg-gray-100 text-gray-900 border'

                const showAdminLabel = !isMe && m.sender?.role === 'admin' && !sameSenderPrev

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                    className="flex flex-col gap-2"
                  >
                    {/* ✅ suppression des dates répétées (1 date par jour) */}
                    {showDayDivider && (
                      <div className="flex justify-center my-2">
                        <span className="text-[11px] text-gray-400 bg-white px-3 py-1 rounded-full border">
                          {new Date(m.created_at).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}

                    <div className={`flex ${align} items-end gap-2`}>
                      {/* ✅ Avatar seulement pour le client */}
                      {!isMe && showAvatar ? (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-white border">
                            {initials(m.sender?.name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        !isMe && <div className="w-8" />
                      )}

                      <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {/* Séparation admin/client + label */}
                        {showAdminLabel && (
                          <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mb-1">
                            Décoratrice
                          </span>
                        )}

                        <div className={`px-4 py-2 text-sm shadow-sm break-words ${bubbleRadius} ${bubbleColor}`}>
                          {m.content}
                        </div>

                        {/* time only for last bubble of group */}
                        {showTime && (
                          <span className="text-[11px] text-gray-400 mt-1">
                            {new Date(m.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}

                        {/* ✅ Vu / non lu : uniquement sous mon dernier message */}
                        {isMe && m.id === lastMyMessageId && (
                          <span className="text-[11px] text-gray-400 mt-1">
                            {lastMyMessageReadByPeer ? 'Vu' : 'Envoyé'}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })
            )}
          </AnimatePresence>

          {/* ✅ typing indicator */}
          <AnimatePresence>
            {peerTyping && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="flex justify-start items-end gap-2 mt-2"
              >
                <div className="w-8" />
                <div className="bg-gray-100 border rounded-2xl px-4 py-2 text-sm text-gray-600 shadow-sm">
                  <span className="inline-flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:120ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:240ms]" />
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-white px-4 py-3">
        <div className="flex gap-3 items-end">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Votre message..."
            rows={2}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={sending || !value.trim()}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
