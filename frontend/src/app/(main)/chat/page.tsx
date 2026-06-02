'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Send, ArrowLeft, Phone, MoreVertical, CheckCheck, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { chatService, type ChatContact, type ChatMessage } from '@/services/chat.service'
import { createWsManager } from '@/core/websocket/wsManager'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { KiliBadge } from '@/components/ui/KiliBadge'
import { KiliButton } from '@/components/ui/KiliButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { useAuthStore } from '@/stores/auth.store'
import { timeAgo, cn } from '@/lib/utils'

// ── Typing indicator ────────────────────────────────
function TypingIndicator({ username }: { username: string }) {
  return (
    <motion.div
      className="flex items-center gap-2 px-4 py-2"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
    >
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-text-muted"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
          />
        ))}
      </div>
      <span className="text-xs text-text-muted">{username} anaandika...</span>
    </motion.div>
  )
}

// ── Message bubble ──────────────────────────────────
function MsgBubble({
  msg,
  isMe,
  showAvatar,
  otherAvatar,
  otherName,
}: {
  msg: ChatMessage
  isMe: boolean
  showAvatar: boolean
  otherAvatar: string | null
  otherName: string
}) {
  return (
    <div className={cn('flex items-end gap-2', isMe ? 'justify-end' : 'justify-start')}>
      {!isMe && (
        <div className="w-7 flex-shrink-0 mb-1">
          {showAvatar && (
            <KiliAvatar src={otherAvatar} name={otherName} size="xs" />
          )}
        </div>
      )}
      <div
        className={cn(
          'max-w-[75%] px-4 py-2.5 rounded-3xl text-sm',
          isMe
            ? 'text-black rounded-br-lg'
            : 'text-text-primary rounded-bl-lg'
        )}
        style={{
          background: isMe
            ? 'linear-gradient(135deg, #F5A623, #E8892A)'
            : 'rgba(26,26,36,0.9)',
          border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <p className="leading-relaxed">{msg.content}</p>
        <div className={cn(
          'flex items-center gap-1 mt-1',
          isMe ? 'justify-end' : 'justify-start'
        )}>
          <span className="text-[10px] opacity-60">
            {new Date(msg.timestamp).toLocaleTimeString('sw-TZ', {
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
          {isMe && (
            <CheckCheck
              size={12}
              className={msg.is_read ? 'text-blue-400' : 'opacity-50'}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Chat window ─────────────────────────────────────
function ChatWindow({
  contact,
  onBack,
}: {
  contact: ChatContact
  onBack: () => void
}) {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wsRef = useRef(createWsManager())
  const bottomRef = useRef<HTMLDivElement>(null)
  const isLoadingRef = useRef(false)

  // Load history
  useEffect(() => {
    chatService.getMessages(contact.room_name).then((msgs) => {
      setMessages(msgs)
    })
  }, [contact.room_name])

  // WebSocket
  useEffect(() => {
    const ws = wsRef.current
    ws.connect(`/ws/chat/${contact.room_name}/`)

    const off = ws.on((data) => {
      if (data.type === 'message') {
        setMessages((prev) => [...prev, data as unknown as ChatMessage])
        // Mark read
        ws.send({ action: 'read', message_ids: [(data as { id: number }).id] })
      } else if (data.type === 'typing') {
        const d = data as { username: string; is_typing: boolean }
        if (d.is_typing) {
          setTypingUser(d.username)
          if (typingTimeout.current) clearTimeout(typingTimeout.current)
          typingTimeout.current = setTimeout(() => setTypingUser(null), 3000)
        } else {
          setTypingUser(null)
        }
      } else if (data.type === 'read') {
        const d = data as { message_ids: number[] }
        setMessages((prev) =>
          prev.map((m) =>
            d.message_ids.includes(m.id) ? { ...m, is_read: true } : m
          )
        )
      }
    })

    return () => {
      off()
      ws.disconnect()
    }
  }, [contact.room_name])

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUser])

  const handleTyping = () => {
    wsRef.current.send({ action: 'typing', is_typing: true })
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      wsRef.current.send({ action: 'typing', is_typing: false })
    }, 2000)
  }

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return
    wsRef.current.send({ action: 'message', content: text })
    setInput('')
  }

  const other = contact.other_user

  return (
    <div className="flex flex-col h-dvh bg-bg-base">
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{
          background: 'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(20px)',
          borderColor: 'var(--border)',
          paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
        }}
      >
        <button onClick={onBack} className="lg:hidden">
          <ArrowLeft size={22} className="text-text-muted" />
        </button>
        <KiliAvatar
          src={other.avatar}
          name={`${other.first_name} ${other.username}`}
          role={other.role}
          isVerified={other.is_verified}
          size="sm"
        />
        <div className="flex-1">
          <p className="font-bold text-text-primary text-sm">
            {other.first_name || other.username}
          </p>
          <KiliBadge variant={other.role as 'TOURIST' | 'LOCAL_GUIDE'} size="xs" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === user?.id
          const prevMsg = messages[i - 1]
          const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id
          return (
            <MsgBubble
              key={msg.id}
              msg={msg}
              isMe={isMe}
              showAvatar={showAvatar}
              otherAvatar={other.avatar}
              otherName={`${other.first_name} ${other.username}`}
            />
          )
        })}
        <AnimatePresence>
          {typingUser && <TypingIndicator username={typingUser} />}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-t"
        style={{
          background: 'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(20px)',
          borderColor: 'var(--border)',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        }}
      >
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); handleTyping() }}
          onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
          placeholder="Andika ujumbe..."
          className="flex-1 bg-bg-elevated border border-border-subtle rounded-3xl px-5 py-3 text-sm text-text-primary outline-none focus:border-gold transition-colors"
        />
        <motion.button
          onClick={sendMessage}
          disabled={!input.trim()}
          whileTap={{ scale: 0.88 }}
          className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-40"
          style={{ background: 'var(--gradient-gold)' }}
        >
          <Send size={18} className="text-black" />
        </motion.button>
      </div>
    </div>
  )
}

// ── Contacts list ───────────────────────────────────
function ContactsList({
  contacts,
  onSelect,
  isLoading,
}: {
  contacts: ChatContact[]
  onSelect: (c: ChatContact) => void
  isLoading: boolean
}) {
  const { user } = useAuthStore()

  return (
    <div className="flex flex-col h-dvh bg-bg-base">
      <div
        className="flex-shrink-0 px-5 py-4 border-b"
        style={{
          paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
          borderColor: 'var(--border)',
        }}
      >
        <h1 className="text-xl font-black text-text-primary">
          💬 Ujumbe
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <EmptyState
            icon="💬"
            title="Hakuna mazungumzo bado"
            subtitle="Anza mazungumzo na guide au tourist kutoka profile yao"
          />
        ) : (
          <div className="divide-y divide-border-subtle">
            {contacts.map((contact) => {
              const isMe =
                contact.last_message?.sender_id === user?.id
              return (
                <motion.div
                  key={contact.room_name}
                  onClick={() => onSelect(contact)}
                  whileTap={{ scale: 0.99 }}
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/3 transition-colors"
                >
                  <KiliAvatar
                    src={contact.other_user.avatar}
                    name={contact.other_user.first_name}
                    role={contact.other_user.role}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-bold text-text-primary text-sm">
                        {contact.other_user.first_name ||
                          contact.other_user.username}
                      </p>
                      {contact.last_message && (
                        <span className="text-[11px] text-text-muted">
                          {timeAgo(contact.last_message.timestamp)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p
                        className={cn(
                          'text-sm truncate max-w-[200px]',
                          contact.unread_count > 0
                            ? 'text-text-primary font-medium'
                            : 'text-text-muted'
                        )}
                      >
                        {isMe && '↩ '}
                        {contact.last_message?.content || 'Anza mazungumzo'}
                      </p>
                      {contact.unread_count > 0 && (
                        <span className="w-5 h-5 rounded-full bg-gold flex items-center justify-center text-[10px] font-bold text-black flex-shrink-0">
                          {contact.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Chat Page ──────────────────────────────────
export default function ChatPage() {
  const router = useRouter()
  const { clearAuth } = useAuthStore()
  const [activeContact, setActiveContact] = useState<ChatContact | null>(null)

  const { data: contacts = [], isLoading, error } = useQuery({
    queryKey: ['contacts'],
    queryFn: chatService.getContacts,
    refetchInterval: 10000,
    staleTime: 5000,
  })

  // Handle auth errors (401)
  const isAuthError = error && (error as any)?.response?.status === 401
  
  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  // Desktop: side by side
  // Mobile: one or the other
  return (
    <div className="flex h-dvh bg-bg-base overflow-hidden">
      {/* Contacts panel */}
      <div
        className={cn(
          'flex-shrink-0',
          activeContact ? 'hidden lg:flex' : 'flex w-full lg:w-80',
          'lg:border-r lg:border-border-subtle'
        )}
      >
        <div className="w-full">
          {isAuthError ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
              <EmptyState
                icon="🔐"
                title="Session expired"
                subtitle="Your session has expired. Please log in again."
              />
              <KiliButton onClick={handleLogout} className="w-full" variant="primary">
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </KiliButton>
            </div>
          ) : (
            <ContactsList
              contacts={contacts}
              onSelect={setActiveContact}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>

      {/* Chat window panel */}
      {activeContact ? (
        <div className="flex-1 min-w-0">
          <ChatWindow
            contact={activeContact}
            onBack={() => setActiveContact(null)}
          />
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center bg-bg-base">
          <EmptyState
            icon="💬"
            title="Chagua mazungumzo"
            subtitle="Chagua contact kuanza kuzungumza"
          />
        </div>
      )}
    </div>
  )
}