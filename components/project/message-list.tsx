'use client'

import { useState, useEffect, useRef } from 'react'
import { sendMessage, getMessages } from '@/app/actions/messages'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import type { Message, Profile } from '@/types/database'

interface MessageListProps {
  projectId: string
  currentUserId: string
}

type MessageWithSender = Message & {
  sender?: { name: string; role: string } | null
}

export function MessageList({ projectId, currentUserId }: MessageListProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
  }, [projectId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async () => {
    const result = await getMessages(projectId)
    if (result.messages) {
      setMessages(result.messages as MessageWithSender[])
    }
    setIsLoading(false)
  }

  const handleSend = async () => {
    if (!newMessage.trim()) return

    setIsSending(true)
    const formData = new FormData()
    formData.append('project_id', projectId)
    formData.append('body', newMessage)

    const result = await sendMessage(formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      setNewMessage('')
      loadMessages()
    }
    setIsSending(false)
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Aucun message. Commencez la conversation !</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMe = message.sender_id === currentUserId
            const isAdmin = message.sender?.role === 'admin'
            
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className={isAdmin ? 'ring-2 ring-amber-500' : ''}>
                  <AvatarFallback className={isAdmin ? 'bg-amber-100 text-amber-700' : ''}>
                    {getInitials(message.sender?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[70%] ${isMe ? 'text-right' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {message.sender?.name || 'Utilisateur'}
                    </span>
                    {isAdmin && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        Décoratrice
                      </span>
                    )}
                  </div>
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      isMe
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.body}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(message.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t pt-4">
        <div className="flex gap-3">
          <Textarea
            placeholder="Votre message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            rows={2}
            className="resize-none"
          />
          <Button
            onClick={handleSend}
            disabled={isSending || !newMessage.trim()}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
